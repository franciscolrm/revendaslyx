import { createUserClient } from "../_shared/supabase-client.ts";
import {
  errorResponse,
  jsonResponse,
  optionsResponse,
} from "../_shared/response.ts";

/**
 * POST /upload-file
 *
 * Recebe um arquivo (multipart/form-data) e:
 * 1. Faz upload para o Supabase Storage (bucket "imports")
 * 2. Registra em uploaded_files
 * 3. Cria import_batch + staging_raw_records (se CSV/JSON)
 *
 * Form fields:
 *   - file: File (obrigatório)
 *   - source_id: UUID (opcional — data_sources.id)
 *   - import_type: string (opcional — tipo de importação)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);

    // Identificar usuário
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return errorResponse("Não autenticado", 401);

    // Buscar app user id
    const { data: appUser } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();
    if (!appUser) return errorResponse("Usuário não encontrado no sistema", 404);

    // Parse multipart
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return errorResponse("Campo 'file' é obrigatório");

    const sourceId = formData.get("source_id") as string | null;
    const importType = formData.get("import_type") as string | null;

    // Upload para Storage
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `imports/${appUser.id}/${timestamp}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("imports")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) return errorResponse(`Erro no upload: ${uploadError.message}`, 500);

    // Registrar uploaded_file
    const { data: uploadedFile, error: fileError } = await supabase
      .from("uploaded_files")
      .insert({
        source_id: sourceId,
        file_name: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        uploaded_by: appUser.id,
      })
      .select("id")
      .single();
    if (fileError) return errorResponse(`Erro ao registrar arquivo: ${fileError.message}`, 500);

    // Processar conteúdo se for CSV ou JSON
    let batchId: string | null = null;
    let stagingCount = 0;

    if (file.type === "application/json" || file.name.endsWith(".json")) {
      const result = await processJson(supabase, file, uploadedFile.id, sourceId, importType);
      batchId = result.batchId;
      stagingCount = result.count;
    } else if (
      file.type === "text/csv" ||
      file.name.endsWith(".csv")
    ) {
      const result = await processCsv(supabase, file, uploadedFile.id, sourceId, importType);
      batchId = result.batchId;
      stagingCount = result.count;
    }

    return jsonResponse({
      uploaded_file_id: uploadedFile.id,
      storage_path: storagePath,
      import_batch_id: batchId,
      staging_records: stagingCount,
    });
  } catch (err) {
    return errorResponse(`Erro interno: ${(err as Error).message}`, 500);
  }
});

// ── Helpers ──────────────────────────────────────────────────

interface StagingResult {
  batchId: string;
  count: number;
}

async function createBatch(
  supabase: ReturnType<typeof createUserClient>,
  uploadedFileId: string,
  sourceId: string | null,
  importType: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .from("import_batches")
    .insert({
      source_id: sourceId,
      uploaded_file_id: uploadedFileId,
      import_type: importType,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Erro ao criar batch: ${error.message}`);
  return data.id;
}

async function insertStaging(
  supabase: ReturnType<typeof createUserClient>,
  batchId: string,
  records: Record<string, unknown>[],
  sourceTableName: string,
): Promise<number> {
  const rows = records.map((r) => ({
    batch_id: batchId,
    source_table_name: sourceTableName,
    raw_payload: r,
  }));

  // Inserir em lotes de 500
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("staging_raw_records").insert(chunk);
    if (error) throw new Error(`Erro no staging: ${error.message}`);
    inserted += chunk.length;
  }

  return inserted;
}

async function processJson(
  supabase: ReturnType<typeof createUserClient>,
  file: File,
  uploadedFileId: string,
  sourceId: string | null,
  importType: string | null,
): Promise<StagingResult> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const records: Record<string, unknown>[] = Array.isArray(parsed)
    ? parsed
    : [parsed];

  const batchId = await createBatch(supabase, uploadedFileId, sourceId, importType);
  const count = await insertStaging(supabase, batchId, records, "json_import");

  return { batchId, count };
}

async function processCsv(
  supabase: ReturnType<typeof createUserClient>,
  file: File,
  uploadedFileId: string,
  sourceId: string | null,
  importType: string | null,
): Promise<StagingResult> {
  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV vazio ou sem dados");

  // Parse header
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  // Parse rows
  const records: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? null;
    });
    records.push(row);
  }

  const batchId = await createBatch(supabase, uploadedFileId, sourceId, importType);
  const count = await insertStaging(supabase, batchId, records, "csv_import");

  return { batchId, count };
}

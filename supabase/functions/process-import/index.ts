import { createUserClient } from "../_shared/supabase-client.ts";
import {
  errorResponse,
  jsonResponse,
  optionsResponse,
} from "../_shared/response.ts";

/**
 * POST /process-import
 *
 * Dispara o processamento de um import_batch.
 * Chama a function SQL process_import_batch() via RPC.
 *
 * Body JSON:
 *   - batch_id: UUID (obrigatório)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return errorResponse("Não autenticado", 401);

    // Verificar permissão de processar importações
    const { data: hasPerm } = await supabase.rpc("user_has_permission", {
      p_module: "imports",
      p_action: "process",
    });
    if (!hasPerm) return errorResponse("Sem permissão para processar importações", 403);

    // Parse body
    const body = await req.json();
    const batchId = body.batch_id;
    if (!batchId) return errorResponse("Campo 'batch_id' é obrigatório");

    // Verificar se batch existe e está pendente
    const { data: batch, error: batchError } = await supabase
      .from("import_batches")
      .select("id, status")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) return errorResponse("Batch não encontrado", 404);
    if (batch.status === "processing") return errorResponse("Batch já está sendo processado");
    if (batch.status === "done") return errorResponse("Batch já foi processado");

    // Chamar function SQL
    const { data: result, error: rpcError } = await supabase.rpc(
      "process_import_batch",
      { p_batch_id: batchId },
    );

    if (rpcError) {
      return errorResponse(`Erro no processamento: ${rpcError.message}`, 500);
    }

    return jsonResponse({
      message: "Importação processada",
      result,
    });
  } catch (err) {
    return errorResponse(`Erro interno: ${(err as Error).message}`, 500);
  }
});

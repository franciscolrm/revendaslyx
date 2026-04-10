import { createServiceClient } from "../_shared/supabase-client.ts";
import {
  errorResponse,
  jsonResponse,
  optionsResponse,
} from "../_shared/response.ts";

/**
 * POST /daily-snapshot
 *
 * Gera o snapshot diário de revendas por status/filial.
 * Chamado via cron (pg_cron ou Supabase Cron) com service_role.
 *
 * Body JSON (opcional):
 *   - reference_date: string (YYYY-MM-DD, default: hoje)
 *   - source_name: string (default: "cron")
 *
 * Auth: Aceita service_role key OU verifica permissão reports.export.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    // Verificar se é chamada via service_role (cron) ou usuário autenticado
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceCall = authHeader === `Bearer ${serviceKey}`;

    let supabase;

    if (isServiceCall) {
      supabase = createServiceClient();
    } else {
      // Importar dinamicamente para não quebrar quando não há auth header
      const { createUserClient } = await import(
        "../_shared/supabase-client.ts"
      );
      supabase = createUserClient(req);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) return errorResponse("Não autenticado", 401);

      const { data: hasPerm } = await supabase.rpc("user_has_permission", {
        p_module: "reports",
        p_action: "export",
      });
      if (!hasPerm) return errorResponse("Sem permissão para gerar snapshots", 403);
    }

    // Parse body
    let referenceDate: string | undefined;
    let sourceName = "cron";

    try {
      const body = await req.json();
      referenceDate = body.reference_date;
      sourceName = body.source_name ?? sourceName;
    } catch {
      // Body vazio é válido — usa defaults
    }

    // Chamar function SQL
    const { data: batchId, error: rpcError } = await supabase.rpc(
      "generate_daily_snapshot",
      {
        p_reference_date: referenceDate ?? new Date().toISOString().split("T")[0],
        p_source_name: sourceName,
      },
    );

    if (rpcError) {
      return errorResponse(`Erro ao gerar snapshot: ${rpcError.message}`, 500);
    }

    return jsonResponse({
      message: "Snapshot gerado com sucesso",
      batch_id: batchId,
      reference_date: referenceDate ?? new Date().toISOString().split("T")[0],
    });
  } catch (err) {
    return errorResponse(`Erro interno: ${(err as Error).message}`, 500);
  }
});

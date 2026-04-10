import { createUserClient } from "../_shared/supabase-client.ts";
import {
  errorResponse,
  jsonResponse,
  optionsResponse,
} from "../_shared/response.ts";

/**
 * POST /change-status
 *
 * Altera o status de uma revenda.
 * Wrapper da function SQL change_resale_status().
 *
 * Body JSON:
 *   - resale_id: UUID (obrigatório)
 *   - status_code: string (obrigatório — code de resale_statuses)
 *   - notes: string (opcional)
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

    // Verificar permissão
    const { data: hasPerm } = await supabase.rpc("user_has_permission", {
      p_module: "resales",
      p_action: "edit",
    });
    if (!hasPerm) return errorResponse("Sem permissão para alterar status", 403);

    // Parse body
    const body = await req.json();
    const { resale_id, status_code, notes } = body;

    if (!resale_id) return errorResponse("Campo 'resale_id' é obrigatório");
    if (!status_code) return errorResponse("Campo 'status_code' é obrigatório");

    // Chamar function SQL
    const { data: historyId, error: rpcError } = await supabase.rpc(
      "change_resale_status",
      {
        p_resale_id: resale_id,
        p_new_status: status_code,
        p_notes: notes ?? null,
      },
    );

    if (rpcError) {
      return errorResponse(rpcError.message, 422);
    }

    return jsonResponse({
      message: "Status alterado com sucesso",
      history_id: historyId,
      new_status: status_code,
    });
  } catch (err) {
    return errorResponse(`Erro interno: ${(err as Error).message}`, 500);
  }
});

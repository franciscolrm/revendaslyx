import { createUserClient, createServiceClient } from "../_shared/supabase-client.ts";
import {
  errorResponse,
  jsonResponse,
  optionsResponse,
} from "../_shared/response.ts";

/**
 * POST /manage-user
 *
 * Cria ou atualiza um usuário no sistema.
 * - Cria o auth user no Supabase Auth (se novo)
 * - Cria/atualiza registro na tabela users
 * - Atribui role e access_scope
 *
 * Body JSON:
 *   - action: "create" | "update"
 *   - email: string (obrigatório para create)
 *   - password: string (obrigatório para create, min 8 chars)
 *   - full_name: string
 *   - phone: string (opcional)
 *   - company_id: UUID (opcional)
 *   - region_id: UUID (opcional)
 *   - branch_id: UUID (opcional)
 *   - team_id: UUID (opcional)
 *   - role_name: string (opcional — nome do role a atribuir)
 *   - scope_type: string (opcional — own|team|branch|region|global)
 *   - user_id: UUID (obrigatório para update)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const userClient = createUserClient(req);

    // Verificar autenticação
    const {
      data: { user: authUser },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !authUser) return errorResponse("Não autenticado", 401);

    const body = await req.json();
    const action = body.action;

    if (action === "create") {
      return await handleCreate(userClient, body);
    } else if (action === "update") {
      return await handleUpdate(userClient, body);
    } else {
      return errorResponse("Campo 'action' deve ser 'create' ou 'update'");
    }
  } catch (err) {
    return errorResponse(`Erro interno: ${(err as Error).message}`, 500);
  }
});

// ── Create ───────────────────────────────────────────────────

async function handleCreate(
  userClient: ReturnType<typeof createUserClient>,
  body: Record<string, unknown>,
) {
  // Verificar permissão
  const { data: hasPerm } = await userClient.rpc("user_has_permission", {
    p_module: "users",
    p_action: "create",
  });
  if (!hasPerm) return errorResponse("Sem permissão para criar usuários", 403);

  const { email, password, full_name, phone, company_id, region_id, branch_id, team_id, role_name, scope_type } = body as Record<string, string>;

  if (!email) return errorResponse("Campo 'email' é obrigatório");
  if (!password || password.length < 8) return errorResponse("Campo 'password' é obrigatório (min 8 caracteres)");
  if (!full_name) return errorResponse("Campo 'full_name' é obrigatório");

  // Criar auth user via service client (precisa de service_role para admin API)
  const serviceClient = createServiceClient();

  const { data: newAuthUser, error: createAuthError } =
    await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createAuthError) {
    return errorResponse(`Erro ao criar auth user: ${createAuthError.message}`, 500);
  }

  // Criar registro na tabela users
  const { data: newUser, error: userError } = await serviceClient
    .from("users")
    .insert({
      auth_id: newAuthUser.user.id,
      full_name,
      email,
      phone: phone ?? null,
      company_id: company_id ?? null,
      region_id: region_id ?? null,
      branch_id: branch_id ?? null,
      team_id: team_id ?? null,
    })
    .select("id")
    .single();

  if (userError) {
    return errorResponse(`Erro ao criar usuário: ${userError.message}`, 500);
  }

  // Atribuir role (se fornecido)
  if (role_name) {
    const { data: role } = await serviceClient
      .from("roles")
      .select("id")
      .eq("name", role_name)
      .single();

    if (role) {
      await serviceClient.from("user_roles").insert({
        user_id: newUser.id,
        role_id: role.id,
      });
    }
  }

  // Atribuir scope (se fornecido)
  if (scope_type) {
    await serviceClient.from("access_scopes").insert({
      user_id: newUser.id,
      scope_type,
      region_id: region_id ?? null,
      branch_id: branch_id ?? null,
      team_id: team_id ?? null,
    });
  }

  return jsonResponse({
    message: "Usuário criado com sucesso",
    user_id: newUser.id,
    auth_id: newAuthUser.user.id,
  }, 201);
}

// ── Update ───────────────────────────────────────────────────

async function handleUpdate(
  userClient: ReturnType<typeof createUserClient>,
  body: Record<string, unknown>,
) {
  // Verificar permissão
  const { data: hasPerm } = await userClient.rpc("user_has_permission", {
    p_module: "users",
    p_action: "edit",
  });
  if (!hasPerm) return errorResponse("Sem permissão para editar usuários", 403);

  const userId = body.user_id as string;
  if (!userId) return errorResponse("Campo 'user_id' é obrigatório para update");

  // Montar update payload (só campos fornecidos)
  const updateFields: Record<string, unknown> = {};
  const allowedFields = ["full_name", "phone", "status", "company_id", "region_id", "branch_id", "team_id", "manager_user_id"];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateFields[field] = body[field];
    }
  }

  if (Object.keys(updateFields).length === 0) {
    return errorResponse("Nenhum campo para atualizar");
  }

  const serviceClient = createServiceClient();

  const { error: updateError } = await serviceClient
    .from("users")
    .update(updateFields)
    .eq("id", userId);

  if (updateError) {
    return errorResponse(`Erro ao atualizar: ${updateError.message}`, 500);
  }

  // Atualizar role se fornecido
  if (body.role_name) {
    const { data: role } = await serviceClient
      .from("roles")
      .select("id")
      .eq("name", body.role_name as string)
      .single();

    if (role) {
      // Remover roles anteriores e atribuir novo
      await serviceClient.from("user_roles").delete().eq("user_id", userId);
      await serviceClient.from("user_roles").insert({
        user_id: userId,
        role_id: role.id,
      });
    }
  }

  // Atualizar scope se fornecido
  if (body.scope_type) {
    await serviceClient.from("access_scopes").delete().eq("user_id", userId);
    await serviceClient.from("access_scopes").insert({
      user_id: userId,
      scope_type: body.scope_type as string,
      region_id: (body.region_id as string) ?? null,
      branch_id: (body.branch_id as string) ?? null,
      team_id: (body.team_id as string) ?? null,
    });
  }

  return jsonResponse({
    message: "Usuário atualizado com sucesso",
    user_id: userId,
  });
}

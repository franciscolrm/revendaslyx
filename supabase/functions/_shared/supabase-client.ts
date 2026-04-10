import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cria client autenticado com o token do usuário (respeita RLS).
 */
export function createUserClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authHeader } },
    },
  );
}

/**
 * Cria client com service_role (bypass RLS) — usar apenas em cron/admin.
 */
export function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

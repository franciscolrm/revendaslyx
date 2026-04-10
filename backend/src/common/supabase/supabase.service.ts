import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly serviceClient: SupabaseClient;

  constructor(private config: ConfigService) {
    this.serviceClient = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  /** Client com service_role — bypass RLS. Usar para operações admin. */
  get admin(): SupabaseClient {
    return this.serviceClient;
  }

  /** Client autenticado com o token do usuário — respeita RLS. */
  forUser(accessToken: string): SupabaseClient {
    return createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_ANON_KEY'),
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      },
    );
  }
}

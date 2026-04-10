import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private supabase: SupabaseService) {}

  async signIn(email: string, password: string) {
    // Retry signIn for intermittent Bad Gateway on self-hosted Supabase
    let signInData: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await this.supabase.admin.auth.signInWithPassword({
        email,
        password,
      });
      if (!error && data?.session) {
        signInData = data;
        break;
      }
      this.logger.warn(`signIn attempt ${attempt + 1} failed: ${error?.message ?? 'no session'}`);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
    }

    if (!signInData) throw new UnauthorizedException('Credenciais inválidas');

    // Buscar dados do app user (retry)
    let appUser: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await this.supabase.admin
        .from('users')
        .select('id, full_name, email, status')
        .eq('auth_id', signInData.user.id)
        .single();
      if (data) {
        appUser = data;
        break;
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }

    if (!appUser) throw new UnauthorizedException('Usuário não cadastrado');
    if (appUser.status !== 'active') throw new UnauthorizedException('Usuário inativo');

    // Buscar roles (retry)
    let roles: any[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await this.supabase.admin
        .from('user_roles')
        .select('role:roles(name)')
        .eq('user_id', appUser.id);
      if (data) {
        roles = data;
        break;
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }

    return {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_at: signInData.session.expires_at,
      user: {
        id: appUser.id,
        full_name: appUser.full_name,
        email: appUser.email,
        roles: roles?.map((r) => (r.role as any)?.name).filter(Boolean) ?? [],
      },
    };
  }

  async refreshToken(refreshToken: string) {
    let sessionData: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await this.supabase.admin.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (!error && data?.session) {
        sessionData = data;
        break;
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }

    if (!sessionData) throw new UnauthorizedException('Refresh token inválido');

    return {
      access_token: sessionData.session!.access_token,
      refresh_token: sessionData.session!.refresh_token,
      expires_at: sessionData.session!.expires_at,
    };
  }
}

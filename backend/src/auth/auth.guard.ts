import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private supabase: SupabaseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Token não fornecido');

    // Validar token com Supabase Auth (retry for Bad Gateway)
    let user: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await this.supabase.admin.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
        break;
      }
      if (attempt < 2) {
        this.logger.warn(`Auth getUser attempt ${attempt + 1} failed: ${error?.message ?? 'no user'}`);
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    if (!user) throw new UnauthorizedException('Token inválido');

    // Buscar app user (retry for Bad Gateway)
    let appUser: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await this.supabase.admin
        .from('users')
        .select('id, email, status')
        .eq('auth_id', user.id)
        .single();
      if (!error && data) {
        appUser = data;
        break;
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    if (!appUser) throw new UnauthorizedException('Usuário não cadastrado no sistema');
    if (appUser.status !== 'active') throw new UnauthorizedException('Usuário inativo');

    request.user = {
      authId: user.id,
      userId: appUser.id,
      email: appUser.email,
      accessToken: token,
    };

    return true;
  }

  private extractToken(request: { headers: { authorization?: string } }): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}

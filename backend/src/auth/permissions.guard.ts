import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '@/common/supabase/supabase.service';
import {
  PERMISSIONS_KEY,
  RequiredPermission,
} from '@/common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { CurrentUserPayload } from '@/common/decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;
    if (!user) throw new ForbiddenException();

    // Buscar roles e permissões do usuário
    const { data: userRoles, error } = await this.supabase.admin
      .from('user_roles')
      .select(`
        role:roles(
          name,
          role_permissions(
            permission:permissions(module, action)
          )
        )
      `)
      .eq('user_id', user.userId);

    if (error) {
      this.logger.error(`Error fetching permissions for user ${user.userId}: ${error.message}`);
      throw new ForbiddenException('Erro ao verificar permissões');
    }

    if (!userRoles || userRoles.length === 0) {
      this.logger.warn(`User ${user.userId} (${user.email}) has no roles assigned`);
      throw new ForbiddenException(
        'Permissão insuficiente: nenhuma role atribuída ao usuário',
      );
    }

    // Admin bypass — roles com acesso total
    const roleNames = userRoles
      .map((ur) => (ur.role as any)?.name)
      .filter(Boolean);

    if (roleNames.includes('super_admin') || roleNames.includes('admin')) {
      return true;
    }

    // Flatten permissões
    const flatPerms = new Set<string>();
    for (const ur of userRoles) {
      const role = ur.role as any;
      if (!role?.role_permissions) continue;
      for (const rp of role.role_permissions) {
        const p = rp.permission as any;
        if (p) flatPerms.add(`${p.module}:${p.action}`);
      }
    }

    // Verificar se tem TODAS as permissões requeridas
    const required = requiredPermissions.map((rp) => `${rp.module}:${rp.action}`);
    const hasAll = required.every((p) => flatPerms.has(p));

    if (!hasAll) {
      const missing = required.filter((p) => !flatPerms.has(p));
      this.logger.warn(
        `User ${user.userId} (${user.email}) missing permissions: ${missing.join(', ')}. Has roles: ${roleNames.join(', ')}`,
      );
      throw new ForbiddenException('Permissão insuficiente');
    }

    return true;
  }
}

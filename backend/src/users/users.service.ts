import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './users.dto';

// Roles que só super_admin/admin_pyx podem atribuir
const PRIVILEGED_ROLES = ['admin', 'super_admin'];

// Scopes que só super_admin/admin_pyx podem atribuir

@Injectable()
export class UsersService {
  constructor(private supabase: SupabaseService) {}

  async list() {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select(
        `
        id, full_name, email, phone, status, created_at,
        company:companies(name),
        region:regions(name),
        branch:branches(name),
        team:teams(name),
        user_roles(role:roles(name))
      `,
      )
      .order('full_name');

    if (error) throw error;
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select(
        `
        *,
        company:companies(id, name),
        region:regions(id, name),
        branch:branches(id, name),
        team:teams(id, name),
        manager:users!users_manager_user_id_fkey(id, full_name),
        user_roles(role:roles(id, name)),
        access_scopes(id, scope_type, region_id, branch_id, team_id)
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Usuário não encontrado');
    return data;
  }

  async create(dto: CreateUserDto, callerUserId: string) {
    // Validar que o caller pode atribuir a role/scope solicitados
    await this.validatePrivilegeEscalation(callerUserId, dto.role_name);

    // Criar auth user
    const { data: authData, error: authError } =
      await this.supabase.admin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });

    if (authError) {
      throw new BadRequestException(`Erro ao criar auth: ${authError.message}`);
    }

    // Criar app user
    const { data: user, error: userError } = await this.supabase.admin
      .from('users')
      .insert({
        auth_id: authData.user.id,
        full_name: dto.full_name,
        email: dto.email,
        phone: dto.phone,
      })
      .select('id')
      .single();

    if (userError) throw userError;

    if (dto.role_name) {
      await this.assignRole(user.id, dto.role_name);
    }

    return { id: user.id };
  }

  async update(id: string, dto: UpdateUserDto, callerUserId: string) {
    // Impedir auto-escalation
    await this.validatePrivilegeEscalation(callerUserId, dto.role_name);

    const { role_name, ...updateFields } = dto;

    if (Object.keys(updateFields).length > 0) {
      const { error } = await this.supabase.admin
        .from('users')
        .update(updateFields)
        .eq('id', id);
      if (error) throw error;
    }

    if (role_name) {
      await this.supabase.admin
        .from('user_roles')
        .delete()
        .eq('user_id', id);
      await this.assignRole(id, role_name);
    }

    return { id };
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    // Buscar auth_id do usuário
    const { data: user, error: findError } = await this.supabase.admin
      .from('users')
      .select('auth_id')
      .eq('id', id)
      .single();

    if (findError || !user) throw new NotFoundException('Usuário não encontrado');

    const { error } = await this.supabase.admin.auth.admin.updateUserById(
      user.auth_id,
      { password: dto.new_password },
    );

    if (error) {
      throw new BadRequestException(`Erro ao alterar senha: ${error.message}`);
    }

    return { message: 'Senha alterada com sucesso' };
  }

  async delete(id: string, callerUserId: string) {
    if (id === callerUserId) {
      throw new BadRequestException('Não é possível excluir a si mesmo');
    }

    // Buscar auth_id
    const { data: user, error: findError } = await this.supabase.admin
      .from('users')
      .select('auth_id')
      .eq('id', id)
      .single();

    if (findError || !user) throw new NotFoundException('Usuário não encontrado');

    // Remover registros dependentes
    await this.supabase.admin.from('access_scopes').delete().eq('user_id', id);
    await this.supabase.admin.from('user_roles').delete().eq('user_id', id);

    // Remover app user
    const { error: deleteError } = await this.supabase.admin
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Remover auth user
    await this.supabase.admin.auth.admin.deleteUser(user.auth_id);

    return { message: 'Usuário excluído com sucesso' };
  }

  /** Valida que o caller tem permissão para atribuir roles privilegiados */
  private async validatePrivilegeEscalation(
    callerUserId: string,
    roleName?: string,
  ) {
    const needsPrivilege = roleName && PRIVILEGED_ROLES.includes(roleName);

    if (!needsPrivilege) return;

    // Buscar roles do caller
    const { data: callerRoles } = await this.supabase.admin
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', callerUserId);

    const callerRoleNames =
      callerRoles?.map((r) => (r.role as any)?.name).filter(Boolean) ?? [];

    const isPrivileged = callerRoleNames.some((name: string) =>
      PRIVILEGED_ROLES.includes(name),
    );

    if (!isPrivileged) {
      throw new ForbiddenException(
        `Apenas admin pode atribuir role "${roleName}"`,
      );
    }
  }

  private async assignRole(userId: string, roleName: string) {
    const { data: role } = await this.supabase.admin
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (role) {
      await this.supabase.admin
        .from('user_roles')
        .insert({ user_id: userId, role_id: role.id });
    }
  }

  private async assignScope(
    userId: string,
    scopeType: string,
    context: { region_id?: string; branch_id?: string; team_id?: string },
  ) {
    await this.supabase.admin.from('access_scopes').insert({
      user_id: userId,
      scope_type: scopeType,
      region_id: context.region_id ?? null,
      branch_id: context.branch_id ?? null,
      team_id: context.team_id ?? null,
    });
  }
}

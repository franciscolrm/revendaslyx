import { UsersService } from './users.service';
import { ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';

describe('UsersService — Privilege Escalation Prevention', () => {
  let service: UsersService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      admin: {
        auth: { admin: { createUser: jest.fn() } },
        from: jest.fn(),
      },
    };
    service = new UsersService(mockSupabase as SupabaseService);
  });

  function mockCallerRoles(roleNames: string[]) {
    mockSupabase.admin.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: roleNames.map((name) => ({ role: { name } })),
          error: null,
        }),
      }),
    });
  }

  describe('create', () => {
    it('should reject non-admin assigning super_admin role', async () => {
      mockCallerRoles(['supervisor']);

      await expect(
        service.create(
          {
            email: 'new@test.com',
            password: '12345678',
            full_name: 'Test',
            role_name: 'super_admin',
          },
          'caller-id',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-admin assigning admin_pyx role', async () => {
      mockCallerRoles(['gerente_regional']);

      await expect(
        service.create(
          {
            email: 'new@test.com',
            password: '12345678',
            full_name: 'Test',
            role_name: 'admin_pyx',
          },
          'caller-id',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-admin assigning global scope', async () => {
      mockCallerRoles(['supervisor']);

      await expect(
        service.create(
          {
            email: 'new@test.com',
            password: '12345678',
            full_name: 'Test',
            role_name: 'admin',
          },
          'caller-id',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow super_admin to assign super_admin role', async () => {
      mockCallerRoles(['super_admin']);

      // Mock createUser
      mockSupabase.admin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'auth-new' } },
        error: null,
      });

      // Mock insert user
      mockSupabase.admin.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-user-id' },
              error: null,
            }),
          }),
        }),
      });

      // Mock assign role (find role)
      mockSupabase.admin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'role-sa-id' },
              error: null,
            }),
          }),
        }),
      });

      // Mock insert user_roles
      mockSupabase.admin.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await service.create(
        {
          email: 'new@test.com',
          password: '12345678',
          full_name: 'Test',
          role_name: 'super_admin',
        },
        'caller-id',
      );

      expect(result).toEqual({ id: 'new-user-id' });
    });

    it('should allow any role to assign non-privileged roles', async () => {
      // No privilege check needed for 'revendedor'
      mockSupabase.admin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'auth-new' } },
        error: null,
      });

      mockSupabase.admin.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-user-id' },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.admin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'role-rev-id' },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.admin.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await service.create(
        {
          email: 'rev@test.com',
          password: '12345678',
          full_name: 'Revendedor',
          role_name: 'revendedor',
        },
        'caller-id',
      );

      expect(result).toEqual({ id: 'new-user-id' });
    });
  });
});

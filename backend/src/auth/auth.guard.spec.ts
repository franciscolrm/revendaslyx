import { AuthGuard } from './auth.guard';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockSupabase: any;
  let reflector: Reflector;

  beforeEach(() => {
    mockSupabase = {
      admin: {
        auth: { getUser: jest.fn() },
        from: jest.fn(),
      },
    };
    reflector = new Reflector();
    guard = new AuthGuard(mockSupabase as SupabaseService, reflector);
  });

  function createMockContext(token?: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: token ? `Bearer ${token}` : undefined,
          },
          user: undefined,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  it('should allow public routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should reject when no token provided', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext();
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject when token is invalid', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockSupabase.admin.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid'),
    });

    const context = createMockContext('bad-token');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject when user not in system', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockSupabase.admin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
    });
    mockSupabase.admin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const context = createMockContext('valid-token');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject inactive user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockSupabase.admin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
    });
    mockSupabase.admin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'u1', email: 'x@x.com', status: 'blocked' },
            error: null,
          }),
        }),
      }),
    });

    const context = createMockContext('valid-token');
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Usuário inativo',
    );
  });

  it('should allow valid active user and set request.user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockSupabase.admin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
    });
    mockSupabase.admin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'u1', email: 'admin@test.com', status: 'active' },
            error: null,
          }),
        }),
      }),
    });

    const request = {
      headers: { authorization: 'Bearer valid-token' },
      user: undefined as any,
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.user).toEqual({
      authId: 'auth-1',
      userId: 'u1',
      email: 'admin@test.com',
      accessToken: 'valid-token',
    });
  });
});

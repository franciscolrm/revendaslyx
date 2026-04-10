import { ScopeService } from './scope.service';
import { SupabaseService } from '@/common/supabase/supabase.service';

describe('ScopeService', () => {
  let service: ScopeService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      admin: {
        from: jest.fn(),
      },
    };
    service = new ScopeService(mockSupabase as SupabaseService);
  });

  describe('getUserScope', () => {
    it('should return own scope when no scopes exist', async () => {
      mockSupabase.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const scope = await service.getUserScope('user-1');
      expect(scope.scopeType).toBe('own');
      expect(scope.regionIds).toEqual([]);
    });

    it('should return global as most permissive scope', async () => {
      mockSupabase.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { scope_type: 'team', region_id: null, branch_id: null, team_id: 't1' },
              { scope_type: 'global', region_id: null, branch_id: null, team_id: null },
            ],
            error: null,
          }),
        }),
      });

      const scope = await service.getUserScope('user-1');
      expect(scope.scopeType).toBe('global');
    });

    it('should collect all region IDs', async () => {
      mockSupabase.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { scope_type: 'region', region_id: 'r1', branch_id: null, team_id: null },
              { scope_type: 'region', region_id: 'r2', branch_id: null, team_id: null },
            ],
            error: null,
          }),
        }),
      });

      const scope = await service.getUserScope('user-1');
      expect(scope.scopeType).toBe('region');
      expect(scope.regionIds).toEqual(['r1', 'r2']);
    });
  });

  describe('applyResaleScope', () => {
    it('should not filter for global scope', () => {
      const qb = { in: jest.fn(), eq: jest.fn() };
      const result = service.applyResaleScope(qb, 'user-1', {
        scopeType: 'global',
        regionIds: [],
        branchIds: [],
        teamIds: [],
      });
      expect(result).toBe(qb);
      expect(qb.in).not.toHaveBeenCalled();
      expect(qb.eq).not.toHaveBeenCalled();
    });

    it('should filter by region_id for region scope', () => {
      const qb = { in: jest.fn().mockReturnThis() };
      service.applyResaleScope(qb, 'user-1', {
        scopeType: 'region',
        regionIds: ['r1', 'r2'],
        branchIds: [],
        teamIds: [],
      });
      expect(qb.in).toHaveBeenCalledWith('region_id', ['r1', 'r2']);
    });

    it('should filter by branch_id for branch scope', () => {
      const qb = { in: jest.fn().mockReturnThis() };
      service.applyResaleScope(qb, 'user-1', {
        scopeType: 'branch',
        regionIds: [],
        branchIds: ['b1'],
        teamIds: [],
      });
      expect(qb.in).toHaveBeenCalledWith('branch_id', ['b1']);
    });

    it('should filter by team_id for team scope', () => {
      const qb = { in: jest.fn().mockReturnThis() };
      service.applyResaleScope(qb, 'user-1', {
        scopeType: 'team',
        regionIds: [],
        branchIds: [],
        teamIds: ['t1'],
      });
      expect(qb.in).toHaveBeenCalledWith('team_id', ['t1']);
    });

    it('should filter by assigned_user_id for own scope', () => {
      const qb = { eq: jest.fn().mockReturnThis() };
      service.applyResaleScope(qb, 'user-1', {
        scopeType: 'own',
        regionIds: [],
        branchIds: [],
        teamIds: [],
      });
      expect(qb.eq).toHaveBeenCalledWith('assigned_user_id', 'user-1');
    });
  });

  describe('canAccessResale', () => {
    it('should allow global scope to access any resale', async () => {
      // getUserScope mock
      mockSupabase.admin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ scope_type: 'global', region_id: null, branch_id: null, team_id: null }],
            error: null,
          }),
        }),
      });

      const result = await service.canAccessResale('user-1', 'resale-1');
      expect(result).toBe(true);
    });

    it('should deny access when resale is in different region', async () => {
      // getUserScope mock
      mockSupabase.admin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ scope_type: 'region', region_id: 'r1', branch_id: null, team_id: null }],
            error: null,
          }),
        }),
      });

      // Resale query mock
      mockSupabase.admin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'resale-1',
                region_id: 'r2',
                branch_id: 'b2',
                team_id: 't2',
                assigned_user_id: 'user-2',
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.canAccessResale('user-1', 'resale-1');
      expect(result).toBe(false);
    });

    it('should allow own scope when user is assigned', async () => {
      mockSupabase.admin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ scope_type: 'own', region_id: null, branch_id: null, team_id: null }],
            error: null,
          }),
        }),
      });

      mockSupabase.admin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'resale-1',
                region_id: 'r1',
                branch_id: 'b1',
                team_id: 't1',
                assigned_user_id: 'user-1',
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.canAccessResale('user-1', 'resale-1');
      expect(result).toBe(true);
    });
  });
});

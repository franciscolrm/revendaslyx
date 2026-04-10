-- ============================================================
-- FIX 1 — RLS: resale_status_history e interactions com scope
-- ============================================================

-- Dropar policies antigas sem filtro de scope
DROP POLICY IF EXISTS status_history_select ON resale_status_history;
DROP POLICY IF EXISTS interactions_select ON resale_interactions;
DROP POLICY IF EXISTS interactions_insert ON resale_interactions;

-- Helper: verifica se o usuário pode ver determinada revenda (respeita scope)
CREATE OR REPLACE FUNCTION public.user_can_access_resale(p_resale_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.resales r
        WHERE r.id = p_resale_id
          AND (
              public.user_scope_type() = 'global'
              OR (
                  public.user_scope_type() = 'region'
                  AND r.region_id IN (
                      SELECT region_id FROM public.access_scopes
                      WHERE user_id = public.current_app_user_id()
                  )
              )
              OR (
                  public.user_scope_type() = 'branch'
                  AND r.branch_id IN (
                      SELECT branch_id FROM public.access_scopes
                      WHERE user_id = public.current_app_user_id()
                  )
              )
              OR (
                  public.user_scope_type() = 'team'
                  AND r.team_id IN (
                      SELECT team_id FROM public.access_scopes
                      WHERE user_id = public.current_app_user_id()
                  )
              )
              OR (
                  public.user_scope_type() = 'own'
                  AND r.assigned_user_id = public.current_app_user_id()
              )
          )
    );
$$;

-- resale_status_history: SELECT com scope
CREATE POLICY status_history_select ON resale_status_history
    FOR SELECT USING (
        public.user_has_permission('resales', 'view')
        AND public.user_can_access_resale(resale_id)
    );

-- resale_interactions: SELECT com scope
CREATE POLICY interactions_select ON resale_interactions
    FOR SELECT USING (
        public.user_has_permission('resales', 'view')
        AND public.user_can_access_resale(resale_id)
    );

-- resale_interactions: INSERT com scope
CREATE POLICY interactions_insert ON resale_interactions
    FOR INSERT WITH CHECK (
        public.user_has_permission('resales', 'edit')
        AND public.user_can_access_resale(resale_id)
    );

-- ============================================================
-- FIX 2 — RLS: financial_values herda scope da revenda
-- ============================================================

DROP POLICY IF EXISTS fin_values_select ON resale_financial_values;
DROP POLICY IF EXISTS fin_values_insert ON resale_financial_values;
DROP POLICY IF EXISTS fin_values_update ON resale_financial_values;

CREATE POLICY fin_values_select ON resale_financial_values
    FOR SELECT USING (
        public.user_has_permission('financial', 'view')
        AND public.user_can_access_resale(resale_id)
    );

CREATE POLICY fin_values_insert ON resale_financial_values
    FOR INSERT WITH CHECK (
        public.user_has_permission('financial', 'edit')
        AND public.user_can_access_resale(resale_id)
    );

CREATE POLICY fin_values_update ON resale_financial_values
    FOR UPDATE USING (
        public.user_has_permission('financial', 'edit')
        AND public.user_can_access_resale(resale_id)
    );

-- ============================================================
-- FIX 3 — RLS: users INSERT/UPDATE para admins
-- ============================================================

CREATE POLICY users_insert ON users
    FOR INSERT WITH CHECK (
        public.user_has_permission('users', 'create')
    );

CREATE POLICY users_update ON users
    FOR UPDATE USING (
        id = public.current_app_user_id()
        OR public.user_has_permission('users', 'edit')
    );

-- ============================================================
-- FIX 4 — Permissions para diretoria e admin_pyx
-- ============================================================

-- diretoria: visão ampla (dashboard, relatórios, financeiro, revendas, auditoria)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'dashboard' AND p.action IN ('view','export'))
    OR (p.module = 'reports'   AND p.action IN ('view','export'))
    OR (p.module = 'financial' AND p.action IN ('view','export'))
    OR (p.module = 'resales'   AND p.action IN ('view','edit','create','assign'))
    OR (p.module = 'audit'     AND p.action = 'view')
)
WHERE r.name = 'diretoria';

-- admin_pyx: tudo (igual super_admin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin_pyx';

-- ============================================================
-- FIX 6 — Trigger automático de updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_resales_updated_at
    BEFORE UPDATE ON resales
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

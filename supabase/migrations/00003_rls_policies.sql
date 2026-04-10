-- ============================================================
-- RLS — Row Level Security
-- ============================================================

-- Habilitar RLS nas tabelas sensíveis
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE resales                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE resale_status_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE resale_interactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE resale_financial_values  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_status_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: função para buscar o user.id a partir do auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- Helper: verifica se o usuário tem uma permission específica
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = public.current_app_user_id()
          AND p.module = p_module
          AND p.action = p_action
    );
$$;

-- ============================================================
-- Helper: verifica scope do usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_scope_type()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT scope_type
    FROM public.access_scopes
    WHERE user_id = public.current_app_user_id()
    ORDER BY
        CASE scope_type
            WHEN 'global' THEN 1
            WHEN 'region' THEN 2
            WHEN 'branch' THEN 3
            WHEN 'team'   THEN 4
            WHEN 'own'    THEN 5
        END
    LIMIT 1;
$$;

-- ============================================================
-- RESALES — Policies
-- ============================================================

-- SELECT: baseado no scope
CREATE POLICY resales_select ON resales
    FOR SELECT USING (
        public.user_has_permission('resales', 'view')
        AND (
            public.user_scope_type() = 'global'
            OR (
                public.user_scope_type() = 'region'
                AND region_id IN (
                    SELECT region_id FROM access_scopes
                    WHERE user_id = public.current_app_user_id()
                )
            )
            OR (
                public.user_scope_type() = 'branch'
                AND branch_id IN (
                    SELECT branch_id FROM access_scopes
                    WHERE user_id = public.current_app_user_id()
                )
            )
            OR (
                public.user_scope_type() = 'team'
                AND team_id IN (
                    SELECT team_id FROM access_scopes
                    WHERE user_id = public.current_app_user_id()
                )
            )
            OR (
                public.user_scope_type() = 'own'
                AND assigned_user_id = public.current_app_user_id()
            )
        )
    );

-- INSERT
CREATE POLICY resales_insert ON resales
    FOR INSERT WITH CHECK (
        public.user_has_permission('resales', 'create')
    );

-- UPDATE
CREATE POLICY resales_update ON resales
    FOR UPDATE USING (
        public.user_has_permission('resales', 'edit')
    );

-- ============================================================
-- RESALE FINANCIAL VALUES — Policies
-- ============================================================

CREATE POLICY fin_values_select ON resale_financial_values
    FOR SELECT USING (
        public.user_has_permission('financial', 'view')
    );

CREATE POLICY fin_values_insert ON resale_financial_values
    FOR INSERT WITH CHECK (
        public.user_has_permission('financial', 'edit')
    );

CREATE POLICY fin_values_update ON resale_financial_values
    FOR UPDATE USING (
        public.user_has_permission('financial', 'edit')
    );

-- ============================================================
-- AUDIT LOGS — somente leitura para quem tem permissão
-- ============================================================

CREATE POLICY audit_select ON audit_logs
    FOR SELECT USING (
        public.user_has_permission('audit', 'view')
    );

-- ============================================================
-- DAILY STATUS SNAPSHOTS — Policies
-- ============================================================

CREATE POLICY snapshots_select ON daily_status_snapshots
    FOR SELECT USING (
        public.user_has_permission('reports', 'view')
    );

-- ============================================================
-- RESALE STATUS HISTORY — segue a mesma lógica de resales
-- ============================================================

CREATE POLICY status_history_select ON resale_status_history
    FOR SELECT USING (
        public.user_has_permission('resales', 'view')
    );

-- ============================================================
-- RESALE INTERACTIONS — segue a mesma lógica de resales
-- ============================================================

CREATE POLICY interactions_select ON resale_interactions
    FOR SELECT USING (
        public.user_has_permission('resales', 'view')
    );

CREATE POLICY interactions_insert ON resale_interactions
    FOR INSERT WITH CHECK (
        public.user_has_permission('resales', 'edit')
    );

-- ============================================================
-- USERS — cada um vê a si mesmo, admin vê todos
-- ============================================================

CREATE POLICY users_select ON users
    FOR SELECT USING (
        id = public.current_app_user_id()
        OR public.user_has_permission('users', 'view')
    );

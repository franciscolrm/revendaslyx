-- ============================================================
-- SECURITY HARDENING
-- ============================================================

-- ============================================================
-- 1. DELETE POLICIES — Tabelas com RLS que não tinham DELETE
-- ============================================================

-- resales: só quem tem permissão E está no scope
CREATE POLICY resales_delete ON resales
    FOR DELETE USING (
        public.user_has_permission('resales', 'delete')
        AND (
            public.user_scope_type() = 'global'
            OR (public.user_scope_type() = 'region' AND region_id IN (
                SELECT region_id FROM access_scopes WHERE user_id = public.current_app_user_id()
            ))
            OR (public.user_scope_type() = 'branch' AND branch_id IN (
                SELECT branch_id FROM access_scopes WHERE user_id = public.current_app_user_id()
            ))
            OR (public.user_scope_type() = 'team' AND team_id IN (
                SELECT team_id FROM access_scopes WHERE user_id = public.current_app_user_id()
            ))
            OR (public.user_scope_type() = 'own' AND assigned_user_id = public.current_app_user_id())
        )
    );

-- resale_financial_values: DELETE com scope
CREATE POLICY fin_values_delete ON resale_financial_values
    FOR DELETE USING (
        public.user_has_permission('financial', 'edit')
        AND public.user_can_access_resale(resale_id)
    );

-- resale_interactions: DELETE com scope
CREATE POLICY interactions_delete ON resale_interactions
    FOR DELETE USING (
        public.user_has_permission('resales', 'edit')
        AND public.user_can_access_resale(resale_id)
    );

-- resale_status_history: IMUTÁVEL — ninguém deleta
CREATE POLICY status_history_no_delete ON resale_status_history
    FOR DELETE USING (false);

CREATE POLICY status_history_no_update ON resale_status_history
    FOR UPDATE USING (false);

-- audit_logs: IMUTÁVEL — ninguém altera ou deleta
CREATE POLICY audit_no_insert ON audit_logs
    FOR INSERT WITH CHECK (false); -- Apenas o trigger SECURITY DEFINER insere

CREATE POLICY audit_no_update ON audit_logs
    FOR UPDATE USING (false);

CREATE POLICY audit_no_delete ON audit_logs
    FOR DELETE USING (false);

-- daily_status_snapshots: somente leitura
CREATE POLICY snapshots_no_delete ON daily_status_snapshots
    FOR DELETE USING (false);

CREATE POLICY snapshots_no_update ON daily_status_snapshots
    FOR UPDATE USING (false);

-- users: DELETE só para admin
CREATE POLICY users_delete ON users
    FOR DELETE USING (
        public.user_has_permission('users', 'delete')
    );

-- ============================================================
-- 2. RLS EM TABELAS SENSÍVEIS QUE FALTAVAM
-- ============================================================

-- uploaded_files
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY uploaded_files_select ON uploaded_files
    FOR SELECT USING (
        uploaded_by = public.current_app_user_id()
        OR public.user_has_permission('imports', 'view')
    );

CREATE POLICY uploaded_files_insert ON uploaded_files
    FOR INSERT WITH CHECK (
        public.user_has_permission('imports', 'upload')
    );

-- import_batches
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_batches_select ON import_batches
    FOR SELECT USING (
        public.user_has_permission('imports', 'view')
    );

CREATE POLICY import_batches_insert ON import_batches
    FOR INSERT WITH CHECK (
        public.user_has_permission('imports', 'upload')
    );

-- import_errors
ALTER TABLE import_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_errors_select ON import_errors
    FOR SELECT USING (
        public.user_has_permission('imports', 'view')
    );

-- staging_raw_records
ALTER TABLE staging_raw_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY staging_select ON staging_raw_records
    FOR SELECT USING (
        public.user_has_permission('imports', 'view')
    );

CREATE POLICY staging_insert ON staging_raw_records
    FOR INSERT WITH CHECK (
        public.user_has_permission('imports', 'upload')
    );

-- snapshot_batches
ALTER TABLE snapshot_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshot_batches_select ON snapshot_batches
    FOR SELECT USING (
        public.user_has_permission('reports', 'view')
    );

-- user_roles — somente admin pode gerenciar
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_select ON user_roles
    FOR SELECT USING (
        user_id = public.current_app_user_id()
        OR public.user_has_permission('users', 'view')
    );

CREATE POLICY user_roles_manage ON user_roles
    FOR ALL USING (
        public.user_has_permission('users', 'edit')
    );

-- access_scopes — somente admin pode gerenciar
ALTER TABLE access_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_scopes_select ON access_scopes
    FOR SELECT USING (
        user_id = public.current_app_user_id()
        OR public.user_has_permission('users', 'view')
    );

CREATE POLICY access_scopes_manage ON access_scopes
    FOR ALL USING (
        public.user_has_permission('users', 'edit')
    );

-- ============================================================
-- 3. SCOPE VALIDATION NAS FUNCTIONS SECURITY DEFINER
-- ============================================================

-- Reescrever change_resale_status com verificação de scope
CREATE OR REPLACE FUNCTION public.change_resale_status(
    p_resale_id   UUID,
    p_new_status  TEXT,
    p_notes       TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id    UUID;
    v_status_id  UUID;
    v_current    UUID;
    v_history_id UUID;
BEGIN
    v_user_id := public.current_app_user_id();

    -- Validar acesso à revenda
    IF NOT public.user_can_access_resale(p_resale_id) THEN
        RAISE EXCEPTION 'Sem acesso a esta revenda';
    END IF;

    SELECT id INTO v_status_id
    FROM public.resale_statuses
    WHERE code = p_new_status AND is_active = true;

    IF v_status_id IS NULL THEN
        RAISE EXCEPTION 'Status "%" não encontrado ou inativo', p_new_status;
    END IF;

    SELECT current_status_id INTO v_current
    FROM public.resales
    WHERE id = p_resale_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Revenda % não encontrada', p_resale_id;
    END IF;

    IF v_current = v_status_id THEN
        RAISE EXCEPTION 'Revenda já está no status "%"', p_new_status;
    END IF;

    UPDATE public.resales
    SET current_status_id = v_status_id
    WHERE id = p_resale_id;

    INSERT INTO public.resale_status_history (resale_id, status_id, changed_by, notes)
    VALUES (p_resale_id, v_status_id, v_user_id, p_notes)
    RETURNING id INTO v_history_id;

    RETURN v_history_id;
END;
$$;

-- Reescrever add_resale_interaction com verificação de scope
CREATE OR REPLACE FUNCTION public.add_resale_interaction(
    p_resale_id        UUID,
    p_interaction_type TEXT,
    p_result           TEXT DEFAULT NULL,
    p_notes            TEXT DEFAULT NULL,
    p_interaction_date TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_id      UUID;
BEGIN
    v_user_id := public.current_app_user_id();

    -- Validar acesso à revenda
    IF NOT public.user_can_access_resale(p_resale_id) THEN
        RAISE EXCEPTION 'Sem acesso a esta revenda';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.resales WHERE id = p_resale_id) THEN
        RAISE EXCEPTION 'Revenda % não encontrada', p_resale_id;
    END IF;

    INSERT INTO public.resale_interactions
        (resale_id, interaction_type, performed_by, interaction_date, result, notes)
    VALUES
        (p_resale_id, p_interaction_type, v_user_id, p_interaction_date, p_result, p_notes)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ============================================================
-- 4. STORAGE — Restringir upload ao próprio folder
-- ============================================================

DROP POLICY IF EXISTS storage_imports_insert ON storage.objects;

CREATE POLICY storage_imports_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'imports'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

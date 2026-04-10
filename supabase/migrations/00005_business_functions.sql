-- ============================================================
-- FUNCTIONS E TRIGGERS DE NEGÓCIO
-- ============================================================

-- ============================================================
-- 1. AUDITORIA AUTOMÁTICA
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_old JSONB := NULL;
    v_new JSONB := NULL;
    v_action TEXT;
    v_entity_id UUID;
BEGIN
    v_user_id := public.current_app_user_id();

    IF TG_OP = 'INSERT' THEN
        v_action := 'insert';
        v_new := to_jsonb(NEW);
        v_entity_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update';
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        v_entity_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        v_old := to_jsonb(OLD);
        v_entity_id := OLD.id;
    END IF;

    INSERT INTO public.audit_logs (user_id, entity_name, entity_id, action, old_data, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, v_entity_id, v_action, v_old, v_new);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- Aplicar trigger de auditoria nas tabelas principais
CREATE TRIGGER trg_audit_resales
    AFTER INSERT OR UPDATE OR DELETE ON resales
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_resale_financial_values
    AFTER INSERT OR UPDATE OR DELETE ON resale_financial_values
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_resale_interactions
    AFTER INSERT OR UPDATE OR DELETE ON resale_interactions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_teams
    AFTER INSERT OR UPDATE OR DELETE ON teams
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_branches
    AFTER INSERT OR UPDATE OR DELETE ON branches
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_regions
    AFTER INSERT OR UPDATE OR DELETE ON regions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_access_scopes
    AFTER INSERT OR UPDATE OR DELETE ON access_scopes
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- ============================================================
-- 2. MUDANÇA DE STATUS DE REVENDA
--    Atualiza resales.current_status_id e registra no histórico
-- ============================================================

CREATE OR REPLACE FUNCTION public.change_resale_status(
    p_resale_id   UUID,
    p_new_status  TEXT,   -- code do resale_statuses
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

    -- Validar status
    SELECT id INTO v_status_id
    FROM public.resale_statuses
    WHERE code = p_new_status AND is_active = true;

    IF v_status_id IS NULL THEN
        RAISE EXCEPTION 'Status "%" não encontrado ou inativo', p_new_status;
    END IF;

    -- Verificar se a revenda existe e pegar status atual
    SELECT current_status_id INTO v_current
    FROM public.resales
    WHERE id = p_resale_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Revenda % não encontrada', p_resale_id;
    END IF;

    -- Não duplicar se já está no mesmo status
    IF v_current = v_status_id THEN
        RAISE EXCEPTION 'Revenda já está no status "%"', p_new_status;
    END IF;

    -- Atualizar status atual
    UPDATE public.resales
    SET current_status_id = v_status_id
    WHERE id = p_resale_id;

    -- Registrar no histórico
    INSERT INTO public.resale_status_history (resale_id, status_id, changed_by, notes)
    VALUES (p_resale_id, v_status_id, v_user_id, p_notes)
    RETURNING id INTO v_history_id;

    RETURN v_history_id;
END;
$$;

-- ============================================================
-- 3. REGISTRAR INTERAÇÃO COM REVENDA
-- ============================================================

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

    -- Validar que a revenda existe
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
-- 4. PROCESSAMENTO DE IMPORTAÇÃO
--    Processa staging_raw_records → resales
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_import_batch(p_batch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec        RECORD;
    v_total      INT := 0;
    v_valid      INT := 0;
    v_invalid    INT := 0;
    v_payload    JSONB;
    v_resale_id  UUID;
    v_status_id  UUID;
BEGIN
    -- Marcar batch como processing
    UPDATE public.import_batches
    SET status = 'processing', started_at = now()
    WHERE id = p_batch_id;

    FOR v_rec IN
        SELECT id, raw_payload
        FROM public.staging_raw_records
        WHERE batch_id = p_batch_id AND processed = false
    LOOP
        v_total := v_total + 1;
        v_payload := v_rec.raw_payload;

        BEGIN
            -- Resolver status pelo code (se fornecido)
            v_status_id := NULL;
            IF v_payload->>'status_code' IS NOT NULL THEN
                SELECT id INTO v_status_id
                FROM public.resale_statuses
                WHERE code = v_payload->>'status_code';
            END IF;

            -- Upsert na resales (external_code como chave de dedup)
            IF v_payload->>'external_code' IS NOT NULL
               AND EXISTS (
                   SELECT 1 FROM public.resales
                   WHERE external_code = v_payload->>'external_code'
               )
            THEN
                UPDATE public.resales SET
                    customer_name     = COALESCE(v_payload->>'customer_name', customer_name),
                    document          = COALESCE(v_payload->>'document', document),
                    phone             = COALESCE(v_payload->>'phone', phone),
                    email             = COALESCE(v_payload->>'email', email),
                    source            = COALESCE(v_payload->>'source', source),
                    notes             = COALESCE(v_payload->>'notes', notes),
                    current_status_id = COALESCE(v_status_id, current_status_id),
                    title             = COALESCE(v_payload->>'title', title)
                WHERE external_code = v_payload->>'external_code'
                RETURNING id INTO v_resale_id;
            ELSE
                INSERT INTO public.resales (
                    external_code, title, customer_name, document,
                    phone, email, source, notes, current_status_id
                ) VALUES (
                    v_payload->>'external_code',
                    v_payload->>'title',
                    v_payload->>'customer_name',
                    v_payload->>'document',
                    v_payload->>'phone',
                    v_payload->>'email',
                    v_payload->>'source',
                    v_payload->>'notes',
                    v_status_id
                )
                RETURNING id INTO v_resale_id;
            END IF;

            -- Marcar staging como processado
            UPDATE public.staging_raw_records
            SET processed = true, processed_at = now()
            WHERE id = v_rec.id;

            v_valid := v_valid + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Registrar erro e continuar
            INSERT INTO public.import_errors (batch_id, row_number, error_message, raw_payload)
            VALUES (p_batch_id, v_total, SQLERRM, v_payload);

            v_invalid := v_invalid + 1;
        END;
    END LOOP;

    -- Finalizar batch
    UPDATE public.import_batches
    SET status      = CASE WHEN v_invalid > 0 AND v_valid = 0 THEN 'error' ELSE 'done' END,
        total_rows  = v_total,
        valid_rows  = v_valid,
        invalid_rows = v_invalid,
        finished_at = now()
    WHERE id = p_batch_id;

    RETURN jsonb_build_object(
        'batch_id',     p_batch_id,
        'total_rows',   v_total,
        'valid_rows',   v_valid,
        'invalid_rows', v_invalid
    );
END;
$$;

-- ============================================================
-- 5. SNAPSHOT DIÁRIO
--    Gera snapshot de contagens por status para uma data
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_daily_snapshot(
    p_reference_date DATE DEFAULT CURRENT_DATE,
    p_source_name    TEXT DEFAULT 'system'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id UUID;
    v_user_id  UUID;
BEGIN
    v_user_id := public.current_app_user_id();

    -- Criar batch
    INSERT INTO public.snapshot_batches (source_name, reference_date, uploaded_by, status)
    VALUES (p_source_name, p_reference_date, v_user_id, 'processing')
    RETURNING id INTO v_batch_id;

    -- Gerar snapshots agrupados por branch (operation) e status
    INSERT INTO public.daily_status_snapshots
        (batch_id, operation_name, snapshot_date, status_name_raw, status_id, quantity)
    SELECT
        v_batch_id,
        COALESCE(b.name, 'Sem Filial'),
        p_reference_date,
        COALESCE(rs.name, 'Sem Status'),
        r.current_status_id,
        COUNT(*)
    FROM public.resales r
    LEFT JOIN public.branches b ON b.id = r.branch_id
    LEFT JOIN public.resale_statuses rs ON rs.id = r.current_status_id
    GROUP BY b.name, rs.name, r.current_status_id;

    -- Finalizar batch
    UPDATE public.snapshot_batches
    SET status = 'done'
    WHERE id = v_batch_id;

    RETURN v_batch_id;
END;
$$;

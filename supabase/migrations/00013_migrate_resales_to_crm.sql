-- ============================================================
-- MIGRATION 00013: Migrar dados de Resales para CRM estruturado
-- Extrai clientes, unidades e processos da tabela resales
-- ============================================================

-- ============================================
-- 1. FUNÇÕES AUXILIARES
-- ============================================

-- Normaliza telefone: remove formatação, adiciona prefixo 55
CREATE OR REPLACE FUNCTION normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
    RETURN NULL;
  END IF;

  -- Remove tudo que não é dígito
  digits := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');

  -- Se começa com +55, já foi tratado como BR
  IF LEFT(digits, 2) = '55' AND LENGTH(digits) BETWEEN 12 AND 13 THEN
    RETURN digits;
  END IF;

  -- Celular BR: 11 dígitos (DDD + 9 + número)
  IF LENGTH(digits) = 11 THEN
    RETURN '55' || digits;
  END IF;

  -- Fixo BR: 10 dígitos (DDD + número)
  IF LENGTH(digits) = 10 THEN
    RETURN '55' || digits;
  END IF;

  -- Se tem menos de 10 dígitos, inválido
  IF LENGTH(digits) < 10 THEN
    RETURN NULL;
  END IF;

  RETURN digits;
END;
$$;

-- Normaliza documento: extrai dígitos, valida CPF (11) ou CNPJ (14)
CREATE OR REPLACE FUNCTION normalize_document(p_doc TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF p_doc IS NULL OR TRIM(p_doc) = '' THEN
    RETURN NULL;
  END IF;

  digits := REGEXP_REPLACE(p_doc, '[^0-9]', '', 'g');

  -- CPF = 11 dígitos, CNPJ = 14 dígitos
  IF LENGTH(digits) NOT IN (11, 14) THEN
    RETURN NULL;
  END IF;

  -- Rejeitar CPFs com todos dígitos iguais (ex: 00000000000)
  IF LENGTH(digits) = 11 AND digits = REPEAT(LEFT(digits, 1), 11) THEN
    RETURN NULL;
  END IF;

  RETURN digits;
END;
$$;

-- Detecta tipo de documento
CREATE OR REPLACE FUNCTION detect_document_type(p_doc TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := normalize_document(p_doc);
  IF normalized IS NULL THEN RETURN NULL; END IF;
  IF LENGTH(normalized) = 11 THEN RETURN 'cpf'; END IF;
  IF LENGTH(normalized) = 14 THEN RETURN 'cnpj'; END IF;
  RETURN NULL;
END;
$$;

-- ============================================
-- 2. ADICIONAR COLUNAS FK NA TABELA RESALES
-- ============================================

ALTER TABLE resales ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_resales_client ON resales(client_id);

ALTER TABLE resales ADD COLUMN IF NOT EXISTS resale_process_id UUID REFERENCES resale_processes(id);
CREATE INDEX IF NOT EXISTS idx_resales_process ON resales(resale_process_id);

-- ============================================
-- 3. FUNÇÃO DE PREVIEW (somente leitura)
-- ============================================

CREATE OR REPLACE FUNCTION preview_resales_migration()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_resales INT;
  v_with_document INT;
  v_with_phone INT;
  v_with_name_only INT;
  v_orphans INT;
  v_unique_by_doc INT;
  v_unique_by_phone INT;
  v_unique_by_name INT;
  v_distinct_sources INT;
  v_already_migrated INT;
BEGIN
  -- Total de resales
  SELECT COUNT(*) INTO v_total_resales FROM resales;

  -- Já migrados
  SELECT COUNT(*) INTO v_already_migrated FROM resales WHERE client_id IS NOT NULL;

  -- Com documento válido
  SELECT COUNT(*) INTO v_with_document
  FROM resales WHERE normalize_document(document) IS NOT NULL;

  -- Com telefone válido (sem documento)
  SELECT COUNT(*) INTO v_with_phone
  FROM resales
  WHERE normalize_document(document) IS NULL
    AND normalize_phone(phone) IS NOT NULL;

  -- Só com nome (sem documento nem telefone)
  SELECT COUNT(*) INTO v_with_name_only
  FROM resales
  WHERE normalize_document(document) IS NULL
    AND normalize_phone(phone) IS NULL
    AND customer_name IS NOT NULL
    AND TRIM(customer_name) != '';

  -- Órfãos (sem nada identificável)
  SELECT COUNT(*) INTO v_orphans
  FROM resales
  WHERE normalize_document(document) IS NULL
    AND normalize_phone(phone) IS NULL
    AND (customer_name IS NULL OR TRIM(customer_name) = '');

  -- Clientes únicos por documento
  SELECT COUNT(DISTINCT normalize_document(document)) INTO v_unique_by_doc
  FROM resales WHERE normalize_document(document) IS NOT NULL;

  -- Clientes únicos por telefone (sem doc)
  SELECT COUNT(DISTINCT normalize_phone(phone)) INTO v_unique_by_phone
  FROM resales
  WHERE normalize_document(document) IS NULL
    AND normalize_phone(phone) IS NOT NULL;

  -- Clientes únicos por nome (sem doc nem tel)
  SELECT COUNT(DISTINCT LOWER(TRIM(customer_name))) INTO v_unique_by_name
  FROM resales
  WHERE normalize_document(document) IS NULL
    AND normalize_phone(phone) IS NULL
    AND customer_name IS NOT NULL
    AND TRIM(customer_name) != '';

  -- Fontes/operações distintas
  SELECT COUNT(DISTINCT COALESCE(source, 'sem_operacao')) INTO v_distinct_sources
  FROM resales;

  RETURN jsonb_build_object(
    'total_resales', v_total_resales,
    'already_migrated', v_already_migrated,
    'with_document', v_with_document,
    'with_phone_only', v_with_phone,
    'with_name_only', v_with_name_only,
    'orphans_no_data', v_orphans,
    'unique_clients_by_document', v_unique_by_doc,
    'unique_clients_by_phone', v_unique_by_phone,
    'unique_clients_by_name', v_unique_by_name,
    'estimated_total_clients', v_unique_by_doc + v_unique_by_phone + v_unique_by_name,
    'distinct_sources', v_distinct_sources
  );
END;
$$;

-- ============================================
-- 4. FUNÇÃO PRINCIPAL DE MIGRAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION migrate_resales_to_crm(p_force BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clients_created INT := 0;
  v_enterprises_created INT := 0;
  v_units_created INT := 0;
  v_processes_created INT := 0;
  v_resales_linked INT := 0;
  v_financial_migrated INT := 0;
  v_activities_migrated INT := 0;
  v_orphans INT := 0;
  v_standard_flow_id UUID;
  v_jersey_flow_id UUID;
  v_standard_first_stage UUID;
  v_jersey_first_stage UUID;
  rec RECORD;
BEGIN
  -- Verificar se já foi migrado
  IF NOT p_force THEN
    SELECT COUNT(*) INTO v_resales_linked FROM resales WHERE client_id IS NOT NULL;
    IF v_resales_linked > 0 THEN
      RETURN jsonb_build_object(
        'error', 'Migração já executada. ' || v_resales_linked || ' resales já linkados. Use p_force=true para re-executar.',
        'already_linked', v_resales_linked
      );
    END IF;
  END IF;

  -- Se forçando, limpar migração anterior
  IF p_force THEN
    -- Remover processos criados pela migração
    DELETE FROM process_stage_history WHERE process_id IN (
      SELECT rp.id FROM resale_processes rp WHERE rp.notes LIKE 'Migrado de resale%'
    );
    DELETE FROM process_financial_entries WHERE process_id IN (
      SELECT rp.id FROM resale_processes rp WHERE rp.notes LIKE 'Migrado de resale%'
    );
    DELETE FROM activities WHERE notes = 'Migrado de resale_interactions';
    DELETE FROM resale_processes WHERE notes LIKE 'Migrado de resale%';

    -- Deslinkar resales
    UPDATE resales SET client_id = NULL, resale_process_id = NULL;

    -- Remover units e clients criados pela migração
    DELETE FROM units WHERE notes LIKE 'Migrado de resale%';
    DELETE FROM clients WHERE notes = 'Migrado automaticamente de resales';

    -- Remover enterprises criados pela migração
    DELETE FROM enterprises WHERE notes = 'Migrado de resales.source';
  END IF;

  -- ════════════════════════════════════════
  -- FASE 1: Criar Enterprises
  -- ════════════════════════════════════════

  INSERT INTO enterprises (name, code, status, notes)
  SELECT DISTINCT
    COALESCE(NULLIF(TRIM(source), ''), 'Sem Operação'),
    LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(source), ''), 'sem_operacao'), '[^a-zA-Z0-9]', '_', 'g')),
    'active',
    'Migrado de resales.source'
  FROM resales
  ON CONFLICT (code) DO NOTHING;

  GET DIAGNOSTICS v_enterprises_created = ROW_COUNT;

  -- ════════════════════════════════════════
  -- FASE 2: Extrair e deduplicar Clientes
  -- ════════════════════════════════════════

  -- 2a. Clientes com documento válido (prioridade máxima)
  INSERT INTO clients (full_name, document_number, document_type, email, phone, client_type, status, notes)
  SELECT
    COALESCE(NULLIF(TRIM(sub.customer_name), ''), 'Cliente sem nome'),
    sub.norm_doc,
    sub.doc_type,
    LOWER(TRIM(sub.email)),
    normalize_phone(sub.phone),
    'seller',
    'active',
    'Migrado automaticamente de resales'
  FROM (
    SELECT DISTINCT ON (normalize_document(document))
      customer_name,
      normalize_document(document) AS norm_doc,
      detect_document_type(document) AS doc_type,
      email,
      phone,
      updated_at
    FROM resales
    WHERE normalize_document(document) IS NOT NULL
    ORDER BY normalize_document(document), updated_at DESC
  ) sub
  WHERE NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.document_number = sub.norm_doc
  );

  GET DIAGNOSTICS v_clients_created = ROW_COUNT;

  -- 2b. Clientes com telefone (sem documento)
  INSERT INTO clients (full_name, email, phone, client_type, status, notes)
  SELECT
    COALESCE(NULLIF(TRIM(sub.customer_name), ''), 'Cliente sem nome'),
    LOWER(TRIM(sub.email)),
    sub.norm_phone,
    'seller',
    'active',
    'Migrado automaticamente de resales'
  FROM (
    SELECT DISTINCT ON (normalize_phone(phone))
      customer_name,
      email,
      normalize_phone(phone) AS norm_phone,
      updated_at
    FROM resales
    WHERE normalize_document(document) IS NULL
      AND normalize_phone(phone) IS NOT NULL
    ORDER BY normalize_phone(phone), updated_at DESC
  ) sub
  WHERE NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.phone = sub.norm_phone
  );

  v_clients_created := v_clients_created + (SELECT COUNT(*) FROM clients WHERE notes = 'Migrado automaticamente de resales') - v_clients_created;

  -- 2c. Clientes só com nome (sem documento nem telefone)
  INSERT INTO clients (full_name, email, client_type, status, notes)
  SELECT
    sub.clean_name,
    LOWER(TRIM(sub.email)),
    'seller',
    'active',
    'Migrado automaticamente de resales'
  FROM (
    SELECT DISTINCT ON (LOWER(TRIM(customer_name)))
      TRIM(customer_name) AS clean_name,
      email,
      updated_at
    FROM resales
    WHERE normalize_document(document) IS NULL
      AND normalize_phone(phone) IS NULL
      AND customer_name IS NOT NULL
      AND TRIM(customer_name) != ''
    ORDER BY LOWER(TRIM(customer_name)), updated_at DESC
  ) sub
  WHERE NOT EXISTS (
    SELECT 1 FROM clients c WHERE LOWER(c.full_name) = LOWER(sub.clean_name)
  );

  SELECT COUNT(*) INTO v_clients_created
  FROM clients WHERE notes = 'Migrado automaticamente de resales';

  -- ════════════════════════════════════════
  -- FASE 3: Linkar resales → clients
  -- ════════════════════════════════════════

  -- 3a. Por documento
  UPDATE resales r
  SET client_id = c.id
  FROM clients c
  WHERE normalize_document(r.document) IS NOT NULL
    AND c.document_number = normalize_document(r.document)
    AND r.client_id IS NULL;

  -- 3b. Por telefone
  UPDATE resales r
  SET client_id = c.id
  FROM clients c
  WHERE r.client_id IS NULL
    AND normalize_document(r.document) IS NULL
    AND normalize_phone(r.phone) IS NOT NULL
    AND c.phone = normalize_phone(r.phone);

  -- 3c. Por nome
  UPDATE resales r
  SET client_id = c.id
  FROM clients c
  WHERE r.client_id IS NULL
    AND normalize_document(r.document) IS NULL
    AND normalize_phone(r.phone) IS NULL
    AND r.customer_name IS NOT NULL
    AND TRIM(r.customer_name) != ''
    AND LOWER(TRIM(r.customer_name)) = LOWER(c.full_name);

  SELECT COUNT(*) INTO v_resales_linked FROM resales WHERE client_id IS NOT NULL;
  SELECT COUNT(*) INTO v_orphans FROM resales WHERE client_id IS NULL;

  -- ════════════════════════════════════════
  -- FASE 4: Criar Units
  -- ════════════════════════════════════════

  INSERT INTO units (enterprise_id, unit_number, status, current_client_id, original_client_id, notes, created_by)
  SELECT
    e.id,
    COALESCE(NULLIF(TRIM(sub.external_code), ''), COALESCE(NULLIF(TRIM(sub.title), ''), 'UNIT-' || LEFT(sub.resale_id::TEXT, 8))),
    'in_resale',
    sub.client_id,
    sub.client_id,
    'Migrado de resale: ' || COALESCE(sub.title, sub.external_code, sub.resale_id::TEXT),
    sub.assigned_user_id
  FROM (
    SELECT DISTINCT ON (COALESCE(NULLIF(TRIM(external_code), ''), COALESCE(NULLIF(TRIM(title), ''), id::TEXT)))
      id AS resale_id,
      external_code,
      title,
      client_id,
      source,
      assigned_user_id,
      updated_at
    FROM resales
    WHERE client_id IS NOT NULL
    ORDER BY COALESCE(NULLIF(TRIM(external_code), ''), COALESCE(NULLIF(TRIM(title), ''), id::TEXT)), updated_at DESC
  ) sub
  LEFT JOIN enterprises e ON e.code = LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(sub.source), ''), 'sem_operacao'), '[^a-zA-Z0-9]', '_', 'g'));

  SELECT COUNT(*) INTO v_units_created FROM units WHERE notes LIKE 'Migrado de resale%';

  -- ════════════════════════════════════════
  -- FASE 5: Criar Resale Processes
  -- ════════════════════════════════════════

  -- Buscar flow types e primeira etapa de cada
  SELECT id INTO v_standard_flow_id FROM resale_flow_types WHERE code = 'standard' LIMIT 1;
  SELECT id INTO v_jersey_flow_id FROM resale_flow_types WHERE code = 'jersey_city' LIMIT 1;

  IF v_standard_flow_id IS NOT NULL THEN
    SELECT id INTO v_standard_first_stage
    FROM flow_stages WHERE flow_type_id = v_standard_flow_id ORDER BY stage_order LIMIT 1;
  END IF;

  IF v_jersey_flow_id IS NOT NULL THEN
    SELECT id INTO v_jersey_first_stage
    FROM flow_stages WHERE flow_type_id = v_jersey_flow_id ORDER BY stage_order LIMIT 1;
  END IF;

  -- Criar processos para cada resale com client_id
  FOR rec IN
    SELECT
      r.id AS resale_id,
      r.client_id,
      r.assigned_user_id,
      r.region_id,
      r.branch_id,
      r.team_id,
      r.source,
      r.created_at AS resale_created_at,
      u.id AS unit_id
    FROM resales r
    LEFT JOIN units u ON u.notes = 'Migrado de resale: ' || COALESCE(r.title, r.external_code, r.id::TEXT)
    WHERE r.client_id IS NOT NULL
      AND r.resale_process_id IS NULL
  LOOP
    DECLARE
      v_flow_id UUID;
      v_first_stage UUID;
      v_process_id UUID;
    BEGIN
      -- Determinar fluxo
      IF rec.source IS NOT NULL AND LOWER(rec.source) LIKE '%jersey%' AND v_jersey_flow_id IS NOT NULL THEN
        v_flow_id := v_jersey_flow_id;
        v_first_stage := v_jersey_first_stage;
      ELSIF v_standard_flow_id IS NOT NULL THEN
        v_flow_id := v_standard_flow_id;
        v_first_stage := v_standard_first_stage;
      ELSE
        CONTINUE; -- Sem flow type disponível
      END IF;

      INSERT INTO resale_processes (
        flow_type_id, unit_id, seller_client_id,
        current_stage_id, status, assigned_user_id,
        region_id, branch_id, team_id,
        priority, started_at, notes, created_at
      ) VALUES (
        v_flow_id, rec.unit_id, rec.client_id,
        v_first_stage, 'active', rec.assigned_user_id,
        rec.region_id, rec.branch_id, rec.team_id,
        'normal', rec.resale_created_at,
        'Migrado de resale ID: ' || rec.resale_id,
        rec.resale_created_at
      )
      RETURNING id INTO v_process_id;

      -- Linkar de volta
      UPDATE resales SET resale_process_id = v_process_id WHERE id = rec.resale_id;

      -- Criar entrada no histórico de etapas
      INSERT INTO process_stage_history (process_id, to_stage_id, changed_at, reason)
      VALUES (v_process_id, v_first_stage, rec.resale_created_at, 'Migração automática');

      v_processes_created := v_processes_created + 1;
    END;
  END LOOP;

  -- ════════════════════════════════════════
  -- FASE 6: Migrar Financial Values
  -- ════════════════════════════════════════

  INSERT INTO process_financial_entries (
    process_id, component_id, entry_type, amount, notes, created_by, created_at
  )
  SELECT
    r.resale_process_id,
    rfv.component_id,
    CASE
      WHEN rfc.component_type = 'receita' THEN 'receivable'
      WHEN rfc.component_type = 'despesa' THEN 'payable'
      ELSE 'receivable'
    END,
    rfv.amount,
    'Migrado de resale_financial_values',
    rfv.created_by,
    rfv.created_at
  FROM resale_financial_values rfv
  JOIN resales r ON r.id = rfv.resale_id
  JOIN resale_financial_components rfc ON rfc.id = rfv.component_id
  WHERE r.resale_process_id IS NOT NULL;

  GET DIAGNOSTICS v_financial_migrated = ROW_COUNT;

  -- ════════════════════════════════════════
  -- FASE 7: Migrar Interactions → Activities
  -- ════════════════════════════════════════

  INSERT INTO activities (
    process_id, client_id, activity_type, title,
    description, scheduled_at, status, result,
    notes, created_by, created_at
  )
  SELECT
    r.resale_process_id,
    r.client_id,
    ri.interaction_type,
    COALESCE(NULLIF(TRIM(ri.result), ''), ri.interaction_type || ' - ' || ri.interaction_date::DATE),
    ri.notes,
    ri.interaction_date,
    'completed',
    ri.result,
    'Migrado de resale_interactions',
    ri.performed_by,
    ri.interaction_date
  FROM resale_interactions ri
  JOIN resales r ON r.id = ri.resale_id
  WHERE r.resale_process_id IS NOT NULL;

  GET DIAGNOSTICS v_activities_migrated = ROW_COUNT;

  -- ════════════════════════════════════════
  -- FASE 8: Atualizar contagens
  -- ════════════════════════════════════════

  UPDATE enterprises e
  SET total_units = sub.cnt
  FROM (
    SELECT enterprise_id, COUNT(*) AS cnt
    FROM units
    WHERE enterprise_id IS NOT NULL
    GROUP BY enterprise_id
  ) sub
  WHERE e.id = sub.enterprise_id;

  -- ════════════════════════════════════════
  -- RETORNO
  -- ════════════════════════════════════════

  RETURN jsonb_build_object(
    'success', true,
    'clients_created', v_clients_created,
    'enterprises_created', v_enterprises_created,
    'units_created', v_units_created,
    'processes_created', v_processes_created,
    'resales_linked', v_resales_linked,
    'resales_orphaned', v_orphans,
    'financial_entries_migrated', v_financial_migrated,
    'activities_migrated', v_activities_migrated
  );
END;
$$;

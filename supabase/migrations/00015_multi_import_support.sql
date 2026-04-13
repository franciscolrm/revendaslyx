-- ============================================================
-- MIGRATION 00015: Multi-Import Support
-- Permite múltiplas importações coexistirem sem sobrescrever.
-- Adiciona import_batch_id em clients, units, resale_processes
-- e process_financial_entries para rastreabilidade por origem.
-- ============================================================

-- ============================================
-- 1. ADICIONAR import_batch_id NAS TABELAS CRM
-- ============================================

-- Clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_import_batch ON clients(import_batch_id);

-- Units
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_units_import_batch ON units(import_batch_id);

-- Resale Processes
ALTER TABLE resale_processes
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_processes_import_batch ON resale_processes(import_batch_id);

-- Process Financial Entries
ALTER TABLE process_financial_entries
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_financial_import_batch ON process_financial_entries(import_batch_id);

-- ============================================
-- 2. GARANTIR source_name NA import_batches
-- ============================================

-- source_name já foi adicionado na 00014, mas garantir que existe
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS source_name TEXT;

-- ============================================
-- 3. VIEW: Fontes de importação disponíveis
-- ============================================

CREATE OR REPLACE VIEW vw_import_sources AS
SELECT
  ib.id AS batch_id,
  ib.source_name,
  ib.import_type,
  ib.status,
  ib.total_rows,
  ib.valid_rows,
  ib.invalid_rows,
  ib.created_at,
  ib.finished_at,
  uf.file_name,
  COUNT(DISTINCT c.id)  AS clients_count,
  COUNT(DISTINCT u.id)  AS units_count,
  COUNT(DISTINCT rp.id) AS processes_count,
  COUNT(DISTINCT pfe.id) AS financial_entries_count
FROM import_batches ib
LEFT JOIN uploaded_files uf ON uf.id = ib.file_id
LEFT JOIN clients c ON c.import_batch_id = ib.id
LEFT JOIN units u ON u.import_batch_id = ib.id
LEFT JOIN resale_processes rp ON rp.import_batch_id = ib.id
LEFT JOIN process_financial_entries pfe ON pfe.import_batch_id = ib.id
WHERE ib.status = 'done'
GROUP BY ib.id, ib.source_name, ib.import_type, ib.status,
         ib.total_rows, ib.valid_rows, ib.invalid_rows,
         ib.created_at, ib.finished_at, uf.file_name
ORDER BY ib.created_at DESC;

-- ============================================
-- 4. ATUALIZAR vw_crm_pipeline COM FILTRO
-- ============================================

CREATE OR REPLACE VIEW vw_crm_pipeline AS
SELECT
  fs.id AS stage_id,
  fs.stage_group,
  fs.stage_order,
  fs.name AS stage_name,
  ft.code AS flow_type_code,
  ft.name AS flow_type_name,
  rp.import_batch_id,
  COUNT(rp.id) AS total_processes,
  COUNT(CASE WHEN rp.priority = 'urgent' THEN 1 END) AS urgent_count,
  COUNT(CASE WHEN rp.priority = 'high' THEN 1 END) AS high_count
FROM flow_stages fs
JOIN resale_flow_types ft ON ft.id = fs.flow_type_id
LEFT JOIN resale_processes rp
  ON rp.current_stage_id = fs.id
  AND rp.status = 'active'
WHERE fs.is_active = true AND ft.is_active = true
GROUP BY fs.id, fs.stage_group, fs.stage_order, fs.name, ft.code, ft.name, rp.import_batch_id
HAVING COUNT(rp.id) > 0
ORDER BY ft.code, fs.stage_order;

-- ============================================
-- 5. ATUALIZAR vw_crm_financial_summary
-- ============================================

CREATE OR REPLACE VIEW vw_crm_financial_summary AS
SELECT
  rp.id AS process_id,
  rp.process_code,
  rp.status AS process_status,
  rp.import_batch_id,
  fs.stage_group,
  fs.name AS stage_name,
  e.name AS enterprise_name,
  un.block_tower,
  un.unit_number,
  sc.full_name AS seller_name,
  pfe.component_id,
  rfc.code AS component_code,
  rfc.name AS component_name,
  rfc.component_type,
  pfe.entry_type,
  pfe.amount,
  pfe.payment_status,
  pfe.description
FROM resale_processes rp
LEFT JOIN flow_stages fs ON fs.id = rp.current_stage_id
LEFT JOIN units un ON un.id = rp.unit_id
LEFT JOIN enterprises e ON e.id = un.enterprise_id
LEFT JOIN clients sc ON sc.id = rp.seller_client_id
LEFT JOIN process_financial_entries pfe ON pfe.process_id = rp.id
LEFT JOIN resale_financial_components rfc ON rfc.id = pfe.component_id
WHERE rp.status IN ('active', 'completed');

-- ============================================
-- 6. ATUALIZAR vw_crm_dashboard
-- ============================================

CREATE OR REPLACE VIEW vw_crm_dashboard AS
SELECT
  rp.import_batch_id,
  COUNT(*) FILTER (WHERE rp.status = 'active') AS active_processes,
  COUNT(*) FILTER (WHERE rp.status = 'completed') AS completed_processes,
  COUNT(*) FILTER (WHERE rp.status = 'cancelled') AS cancelled_processes,
  COUNT(*) FILTER (WHERE rp.status = 'paused') AS paused_processes,
  COUNT(*) AS total_processes,
  COUNT(DISTINCT rp.seller_client_id) AS total_sellers,
  COUNT(DISTINCT rp.buyer_client_id) FILTER (WHERE rp.buyer_client_id IS NOT NULL) AS total_buyers,
  COUNT(DISTINCT rp.unit_id) FILTER (WHERE rp.unit_id IS NOT NULL) AS total_units
FROM resale_processes rp
GROUP BY rp.import_batch_id;

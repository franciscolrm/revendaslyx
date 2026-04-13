-- ============================================================
-- MIGRATION 00014: Import System Overhaul
-- Tracking profissional, rastreabilidade por linha, views seguras
-- ============================================================

-- ============================================
-- 1. ESTENDER import_batches
-- ============================================

ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS processing_time_ms INT;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS file_size INT;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS duplicate_count INT DEFAULT 0;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS replaced_count INT DEFAULT 0;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS error_summary JSONB;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS reference_date DATE;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS source_name TEXT;

-- Adicionar file_size na uploaded_files também
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS file_size INT;

-- ============================================
-- 2. CRIAR import_batch_items (rastreio por linha)
-- ============================================

CREATE TABLE IF NOT EXISTS import_batch_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id   UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number        INT NOT NULL,
  bl_und            TEXT,
  sheet_name        TEXT,
  raw_data          JSONB,
  validation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending','valid','invalid','duplicate','skipped')),
  validation_errors TEXT[] DEFAULT '{}',
  entity_type       TEXT CHECK (entity_type IN ('client','unit','process','financial','enterprise')),
  entity_id         UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON import_batch_items(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_status ON import_batch_items(validation_status);
CREATE INDEX IF NOT EXISTS idx_batch_items_bl_und ON import_batch_items(bl_und);

-- ============================================
-- 3. RLS para import_batch_items
-- ============================================

ALTER TABLE import_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY batch_items_select ON import_batch_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY batch_items_all_service ON import_batch_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 4. RECRIAR vw_crm_pipeline (segura)
-- ============================================

CREATE OR REPLACE VIEW vw_crm_pipeline AS
SELECT
  fs.stage_group,
  fs.stage_order,
  fs.name AS stage_name,
  ft.code AS flow_type_code,
  ft.name AS flow_type_name,
  COUNT(rp.id) AS total_processes,
  COUNT(CASE WHEN rp.priority = 'urgent' THEN 1 END) AS urgent_count,
  COUNT(CASE WHEN rp.priority = 'high' THEN 1 END) AS high_count
FROM flow_stages fs
JOIN resale_flow_types ft ON ft.id = fs.flow_type_id
LEFT JOIN resale_processes rp
  ON rp.current_stage_id = fs.id
  AND rp.status = 'active'
WHERE fs.is_active = true AND ft.is_active = true
GROUP BY fs.id, fs.stage_group, fs.stage_order, fs.name, ft.code, ft.name
HAVING COUNT(rp.id) > 0
ORDER BY ft.code, fs.stage_order;

-- ============================================
-- 5. CRIAR vw_crm_financial_summary
-- ============================================

CREATE OR REPLACE VIEW vw_crm_financial_summary AS
SELECT
  rp.id AS process_id,
  rp.process_code,
  rp.status AS process_status,
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
-- 6. Recriar vw_crm_dashboard (atualizada)
-- ============================================

CREATE OR REPLACE VIEW vw_crm_dashboard AS
SELECT
  COUNT(*) FILTER (WHERE rp.status = 'active') AS active_processes,
  COUNT(*) FILTER (WHERE rp.status = 'completed') AS completed_processes,
  COUNT(*) FILTER (WHERE rp.status = 'cancelled') AS cancelled_processes,
  COUNT(*) FILTER (WHERE rp.status = 'paused') AS paused_processes,
  COUNT(*) AS total_processes,
  COUNT(DISTINCT rp.seller_client_id) AS total_sellers,
  COUNT(DISTINCT rp.buyer_client_id) FILTER (WHERE rp.buyer_client_id IS NOT NULL) AS total_buyers,
  COUNT(DISTINCT rp.unit_id) FILTER (WHERE rp.unit_id IS NOT NULL) AS total_units,
  (SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'in_progress')) AS pending_tasks,
  (SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'in_progress') AND due_date < now()) AS overdue_tasks,
  (SELECT COUNT(*) FROM documents WHERE status = 'pending') AS pending_documents,
  (SELECT COALESCE(SUM(pfe.amount) FILTER (WHERE pfe.entry_type = 'receivable'), 0) FROM process_financial_entries pfe JOIN resale_processes rp2 ON rp2.id = pfe.process_id WHERE rp2.status IN ('active','completed')) AS total_receivable,
  (SELECT COALESCE(SUM(pfe.amount) FILTER (WHERE pfe.entry_type = 'payable'), 0) FROM process_financial_entries pfe JOIN resale_processes rp2 ON rp2.id = pfe.process_id WHERE rp2.status IN ('active','completed')) AS total_payable
FROM resale_processes rp;

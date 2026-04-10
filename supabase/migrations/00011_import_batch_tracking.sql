-- ============================================================
-- MIGRATION 00011: Import batch tracking
-- Adds import_batch_id to daily_status_snapshots for lote tracking
-- Adds file_hash to uploaded_files for duplicate detection
-- Adds snapshot_date to daily_status_snapshots
-- ============================================================

-- Add file_hash column to uploaded_files for duplicate detection
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS file_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_uploaded_files_hash ON uploaded_files(file_hash);

-- Add import_batch_id to daily_status_snapshots for lote tracking
ALTER TABLE daily_status_snapshots
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;

-- Add snapshot_date for date-level filtering
ALTER TABLE daily_status_snapshots
  ADD COLUMN IF NOT EXISTS snapshot_date DATE;

CREATE INDEX IF NOT EXISTS idx_snapshots_import_batch ON daily_status_snapshots(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON daily_status_snapshots(snapshot_date);

-- View: pipeline data with import batch info
CREATE OR REPLACE VIEW vw_pipeline_by_batch AS
SELECT
  sb.id AS snapshot_batch_id,
  sb.source_name,
  sb.reference_date,
  sb.created_at AS batch_created_at,
  dss.import_batch_id,
  dss.operation_name,
  dss.status_name_raw,
  dss.quantity,
  dss.call_quantity,
  dss.snapshot_date
FROM daily_status_snapshots dss
JOIN snapshot_batches sb ON sb.id = dss.batch_id
WHERE sb.status = 'done';

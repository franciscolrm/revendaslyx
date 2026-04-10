import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import * as crypto from 'crypto';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);
  private bucketReady = false;

  constructor(private supabase: SupabaseService) {}

  // ── Bucket ──────────────────────────────────────────────────

  private async ensureBucket() {
    if (this.bucketReady) return;
    try {
      const { data: buckets } = await this.supabase.admin.storage.listBuckets();
      const exists = buckets?.some((b) => b.id === 'imports');
      if (!exists) {
        await this.supabase.admin.storage.createBucket('imports', { public: false });
      }
    } catch (err: any) {
      this.logger.warn(`ensureBucket: ${err.message}`);
    }
    this.bucketReady = true;
  }

  // ── List / Detail / Delete ─────────────────────────────────

  async listBatches(filters?: { status?: string; import_type?: string }) {
    let qb = this.supabase.admin
      .from('import_batches')
      .select(
        `id, import_type, status, total_rows, valid_rows, invalid_rows,
         started_at, finished_at, created_at,
         file:uploaded_files(file_name, mime_type)`,
      )
      .order('created_at', { ascending: false });

    if (filters?.status) qb = qb.eq('status', filters.status);
    if (filters?.import_type) qb = qb.eq('import_type', filters.import_type);

    const { data, error } = await qb;
    if (error) throw error;
    return data;
  }

  async getBatchDetail(batchId: string) {
    const { data, error } = await this.supabase.admin
      .from('import_batches')
      .select(
        `*, file:uploaded_files(file_name, storage_path, mime_type),
         errors:import_errors(id, row_number, field_name, error_message)`,
      )
      .eq('id', batchId)
      .single();
    if (error || !data) throw new NotFoundException('Batch não encontrado');
    return data;
  }

  async deleteBatch(batchId: string) {
    // Try to delete snapshots linked to this import batch (import_batch_id may not exist)
    try {
      const { data: snapshots } = await this.supabase.admin
        .from('daily_status_snapshots')
        .select('batch_id')
        .eq('import_batch_id', batchId)
        .limit(1);

      if (snapshots?.length) {
        const snapshotBatchId = snapshots[0].batch_id;
        await this.supabase.admin
          .from('daily_status_snapshots')
          .delete()
          .eq('import_batch_id', batchId);

        const { count } = await this.supabase.admin
          .from('daily_status_snapshots')
          .select('id', { count: 'exact', head: true })
          .eq('batch_id', snapshotBatchId);
        if (count === 0) {
          await this.supabase.admin
            .from('snapshot_batches')
            .delete()
            .eq('id', snapshotBatchId);
        }
      }
    } catch {
      // import_batch_id column may not exist yet
    }

    await this.supabase.admin.from('import_errors').delete().eq('batch_id', batchId);
    await this.supabase.admin.from('staging_raw_records').delete().eq('batch_id', batchId);

    const { data: batch } = await this.supabase.admin
      .from('import_batches')
      .select('uploaded_file_id')
      .eq('id', batchId)
      .single();

    await this.supabase.admin.from('import_batches').delete().eq('id', batchId);

    if (batch?.uploaded_file_id) {
      await this.supabase.admin.from('uploaded_files').delete().eq('id', batch.uploaded_file_id);
    }

    return { deleted: true };
  }

  // ── Snapshot batches for selectors ─────────────────────────

  async getFinancialItems(importBatchId?: string) {
    let qb = this.supabase.admin
      .from('imported_financial_items')
      .select('*')
      .order('created_at', { ascending: true });

    if (importBatchId) {
      qb = qb.eq('import_batch_id', importBatchId);
    }

    const { data, error } = await qb;
    if (error) throw error;
    return data;
  }

  async listSnapshotBatches() {
    const { data, error } = await this.supabase.admin
      .from('snapshot_batches')
      .select('id, source_name, reference_date, status, created_at')
      .eq('status', 'done')
      .order('reference_date', { ascending: false });
    if (error) throw error;
    return data;
  }

  // ── Upload + Direct Process ────────────────────────────────

  async uploadAndProcess(
    file: Express.Multer.File,
    userId: string,
    sourceId?: string,
    importType?: string,
  ) {
    await this.ensureBucket();
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileHash = crypto.createHash('md5').update(file.buffer).digest('hex');

    this.logger.log(`Processing "${file.originalname}" (${file.size} bytes, hash: ${fileHash})...`);

    // Check duplicate
    const { data: existingFile } = await this.supabase.admin
      .from('uploaded_files')
      .select('id, file_name, created_at')
      .eq('file_hash', fileHash)
      .limit(1)
      .maybeSingle();

    const duplicateWarning = existingFile
      ? `Arquivo semelhante já importado: "${existingFile.file_name}" em ${new Date(existingFile.created_at).toLocaleString('pt-BR')}`
      : null;

    // Register file (file_hash is optional — column may not exist yet)
    const filePayload: Record<string, unknown> = {
      file_name: file.originalname,
      storage_path: `local/${timestamp}_${safeName}`,
      mime_type: file.mimetype,
      uploaded_by: userId,
      ...(sourceId ? { source_id: sourceId } : {}),
    };

    // Try with file_hash first, fallback without it
    let uploadedFile: { id: string };
    const { data: f1, error: e1 } = await this.supabase.admin
      .from('uploaded_files')
      .insert({ ...filePayload, file_hash: fileHash })
      .select('id')
      .single();

    if (e1) {
      this.logger.warn(`Insert with file_hash failed (${e1.message}), retrying without...`);
      const { data: f2, error: e2 } = await this.supabase.admin
        .from('uploaded_files')
        .insert(filePayload)
        .select('id')
        .single();
      if (e2) throw new InternalServerErrorException(`Erro registrar arquivo: ${e2.message}`);
      uploadedFile = f2;
    } else {
      uploadedFile = f1;
    }

    // Detect type
    const content = file.buffer.toString('utf-8');
    const detectedType = importType || this.detectImportType(file.originalname, content);
    this.logger.log(`Detected type: ${detectedType}`);

    // Create import batch
    const { data: batch, error: batchError } = await this.supabase.admin
      .from('import_batches')
      .insert({
        uploaded_file_id: uploadedFile.id,
        import_type: detectedType,
        status: 'processing',
        total_rows: 0,
        started_at: new Date().toISOString(),
        ...(sourceId ? { source_id: sourceId } : {}),
      })
      .select('id')
      .single();
    if (batchError) throw new InternalServerErrorException(`Erro criar lote: ${batchError.message}`);

    try {
      let result: any;
      switch (detectedType) {
        case 'snapshot':
          result = await this.processSnapshotPivot(batch.id, content, file.originalname);
          break;
        case 'financial':
          result = await this.processFinancial(batch.id, content);
          break;
        default:
          const records = this.parseFlatCsv(content);
          result = await this.stageAndProcessResales(batch.id, records);
          break;
      }

      return {
        ...result,
        uploaded_file_id: uploadedFile.id,
        import_batch_id: batch.id,
        import_type: detectedType,
        duplicate_warning: duplicateWarning,
      };
    } catch (err: any) {
      await this.supabase.admin
        .from('import_batches')
        .update({ status: 'error', finished_at: new Date().toISOString() })
        .eq('id', batch.id);
      throw err;
    }
  }

  // ── Process Snapshot Pivot CSV ─────────────────────────────
  // The Jersey CSV has a pivot structure with multiple date columns

  private async processSnapshotPivot(importBatchId: string, content: string, filename: string) {
    const lines = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n');

    // Find the date header row (contains "Jersey" or date-like patterns)
    let dateHeaderIdx = -1;
    let dataHeaderIdx = -1;

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      if (/jersey|reno|operação|operacao/i.test(line) && line.includes(',')) {
        dateHeaderIdx = i;
      }
      if (/status.*quantidade/i.test(line) && line.includes(',')) {
        dataHeaderIdx = i;
        break;
      }
    }

    if (dataHeaderIdx === -1) {
      // Fallback: try flat CSV parsing
      const records = this.parseFlatCsv(content);
      return this.processSnapshotFlat(importBatchId, records, filename);
    }

    const sep = this.detectSeparator(lines[dataHeaderIdx]);
    const dateHeaderCells = this.parseRow(lines[dateHeaderIdx] ?? '', sep);
    const dataHeaderCells = this.parseRow(lines[dataHeaderIdx], sep);

    // Extract date groups from the date header row
    const dateGroups: { colStart: number; name: string; date: string }[] = [];

    for (let c = 0; c < dateHeaderCells.length; c++) {
      const cell = dateHeaderCells[c].trim();
      if (!cell) continue;

      // Extract operation name and date
      const match = cell.match(/^(.+?)\s*(\d{2})-(\d{2})$/);
      if (match) {
        const opName = match[1].trim();
        const day = match[2];
        const month = match[3];
        const year = new Date().getFullYear();
        const dateStr = `${year}-${month}-${day}`;
        dateGroups.push({ colStart: c, name: opName, date: dateStr });
      }
    }

    if (dateGroups.length === 0) {
      const records = this.parseFlatCsv(content);
      return this.processSnapshotFlat(importBatchId, records, filename);
    }

    // For each date group, find the Status/Quantidade/Ligação columns
    const colMap: { name: string; date: string; statusCol: number; qtyCol: number; callCol: number }[] = [];

    for (const group of dateGroups) {
      // Look for Status, Quantidade, Qtde Ligação columns after colStart
      let statusCol = -1;
      let qtyCol = -1;
      let callCol = -1;

      for (let c = group.colStart; c < Math.min(group.colStart + 5, dataHeaderCells.length); c++) {
        const header = dataHeaderCells[c].trim().toLowerCase();
        if (header === 'status') statusCol = c;
        else if (header.includes('quantidade') || header === 'qtde') qtyCol = c;
        else if (header.includes('liga')) callCol = c;
      }

      if (statusCol >= 0 && qtyCol >= 0) {
        colMap.push({
          name: group.name,
          date: group.date,
          statusCol,
          qtyCol,
          callCol: callCol >= 0 ? callCol : -1,
        });
      }
    }

    this.logger.log(`Found ${colMap.length} date groups in pivot CSV`);

    // Parse data rows
    const allSnapshots: {
      operation_name: string;
      snapshot_date: string;
      status_name_raw: string;
      quantity: number;
      call_quantity: number;
    }[] = [];

    const startRow = dataHeaderIdx + 1;
    let totalRows = 0;

    for (let r = startRow; r < lines.length; r++) {
      const line = lines[r].trim();
      if (!line) continue;

      const cells = this.parseRow(line, sep);
      if (!cells.some((c) => c.trim())) continue;

      totalRows++;

      for (const group of colMap) {
        const statusRaw = (cells[group.statusCol] ?? '').trim();
        if (!statusRaw) continue;
        if (/^total\s*geral$/i.test(statusRaw)) continue;
        if (statusRaw === '(vazio)') continue;
        if (/^(status|quantidade)$/i.test(statusRaw)) continue;

        const qtyStr = (cells[group.qtyCol] ?? '').trim();
        const callStr = group.callCol >= 0 ? (cells[group.callCol] ?? '').trim() : '0';

        const qty = parseInt(qtyStr, 10) || 0;
        const calls = parseInt(callStr, 10) || 0;

        if (qty > 0 || statusRaw.toLowerCase().includes('vendida')) {
          allSnapshots.push({
            operation_name: group.name,
            snapshot_date: group.date,
            status_name_raw: statusRaw.replace(/^\d+\.?\s*/, '').trim() || statusRaw,
            quantity: qty,
            call_quantity: calls,
          });
        }
      }
    }

    // Group snapshots by date and create one snapshot_batch per date
    const byDate = new Map<string, typeof allSnapshots>();
    for (const s of allSnapshots) {
      if (!byDate.has(s.snapshot_date)) byDate.set(s.snapshot_date, []);
      byDate.get(s.snapshot_date)!.push(s);
    }

    let totalSnapshots = 0;
    const snapshotBatchIds: string[] = [];

    for (const [date, snapshots] of byDate) {
      const { data: sb, error: sbErr } = await this.supabase.admin
        .from('snapshot_batches')
        .insert({
          source_name: filename,
          reference_date: date,
          status: 'done',
        })
        .select('id')
        .single();
      if (sbErr) {
        this.logger.error(`Snapshot batch for ${date}: ${sbErr.message}`);
        continue;
      }

      snapshotBatchIds.push(sb.id);

      // Base row always includes snapshot_date (NOT NULL in DB)
      const baseRows = snapshots.map((s) => ({
        batch_id: sb.id,
        operation_name: s.operation_name,
        status_name_raw: s.status_name_raw,
        quantity: s.quantity,
        call_quantity: s.call_quantity,
        snapshot_date: date,
      }));

      for (let i = 0; i < baseRows.length; i += 50) {
        const chunk = baseRows.slice(i, i + 50);
        const { error: insErr } = await this.supabase.admin
          .from('daily_status_snapshots')
          .insert(chunk);
        if (insErr) {
          this.logger.error(`Snapshot insert chunk ${i}: ${insErr.message}`);
        }
      }

      totalSnapshots += snapshots.length;
    }

    await this.finalizeBatch(importBatchId, totalRows, totalSnapshots, 0);

    this.logger.log(
      `Pivot done: ${byDate.size} dates, ${totalSnapshots} snapshots from ${totalRows} rows`,
    );

    return {
      valid_rows: totalSnapshots,
      invalid_rows: 0,
      total_rows: totalRows,
      dates_found: byDate.size,
      snapshots_created: totalSnapshots,
      snapshot_batch_ids: snapshotBatchIds,
    };
  }

  // ── Process Snapshot Flat (fallback) ───────────────────────

  private async processSnapshotFlat(
    importBatchId: string,
    records: Record<string, unknown>[],
    filename: string,
  ) {
    const today = new Date().toISOString().split('T')[0];

    const { data: sb, error: sbErr } = await this.supabase.admin
      .from('snapshot_batches')
      .insert({ source_name: filename, reference_date: today, status: 'done' })
      .select('id')
      .single();
    if (sbErr) throw new InternalServerErrorException(`Snapshot batch: ${sbErr.message}`);

    let validCount = 0;
    const snapshots: any[] = [];

    for (const payload of records) {
      const entries = Object.entries(payload).filter(([, v]) => v !== null && v !== '');
      if (entries.length === 0) continue;

      let statusName: string | null = null;
      for (const [, val] of entries) {
        if (typeof val === 'string' && val.trim() && !/^\d+$/.test(val.trim())) {
          const v = val.trim();
          if (['Status', 'Quantidade', 'Total Geral', '(vazio)'].includes(v)) continue;
          if (v.includes('Ligação') || v.includes('Ligacao')) continue;
          statusName = v;
          break;
        }
      }
      if (!statusName) continue;

      const nums = entries
        .filter(([, v]) => /^\d+$/.test(String(v).trim()))
        .map(([, v]) => parseInt(String(v), 10));

      const qty = nums[0] ?? 0;
      const calls = nums[1] ?? 0;

      if (qty > 0 || statusName.toLowerCase().includes('vendida')) {
        snapshots.push({
          batch_id: sb.id,
          operation_name: 'Import',
          snapshot_date: today,
          status_name_raw: statusName,
          quantity: qty,
          call_quantity: calls,
        });
      }
      validCount++;
    }

    if (snapshots.length > 0) {
      for (let i = 0; i < snapshots.length; i += 50) {
        const chunk = snapshots.slice(i, i + 50);
        await this.supabase.admin.from('daily_status_snapshots').insert(chunk);
      }
    }

    await this.finalizeBatch(importBatchId, records.length, validCount, 0);
    return { valid_rows: validCount, invalid_rows: 0, snapshots_created: snapshots.length };
  }

  // ── Process Financial ─────────────────────────────────────

  private async processFinancial(importBatchId: string, content: string) {
    const lines = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((l) => l.trim());

    const items: { import_batch_id: string; item_name: string; item_type: string }[] = [];

    for (const line of lines) {
      const cleaned = line.replace(/"/g, '').trim();
      if (!cleaned) continue;
      if (cleaned.toLowerCase().includes('o que comp')) continue;

      // Parse: "Valor de financimento" or "Comissão de 6,5%"
      items.push({
        import_batch_id: importBatchId,
        item_name: cleaned,
        item_type: 'component',
      });
    }

    // Persist into imported_financial_items
    if (items.length > 0) {
      const { error } = await this.supabase.admin
        .from('imported_financial_items')
        .insert(items);
      if (error) {
        this.logger.error(`Financial insert: ${error.message}`);
      } else {
        this.logger.log(`Financial: ${items.length} items saved`);
      }
    }

    await this.finalizeBatch(importBatchId, lines.length, items.length, 0);
    return { valid_rows: items.length, invalid_rows: 0, total_rows: lines.length };
  }

  // ── Stage + Process Resales ────────────────────────────────

  private async stageAndProcessResales(
    batchId: string,
    records: Record<string, unknown>[],
  ) {
    const rows = records.map((r) => ({
      batch_id: batchId,
      source_table_name: 'resales',
      raw_payload: r,
    }));
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await this.supabase.admin.from('staging_raw_records').insert(chunk);
      if (error) throw new InternalServerErrorException(`Staging: ${error.message}`);
    }
    const { data, error } = await this.supabase.admin.rpc('process_import_batch', {
      p_batch_id: batchId,
    });
    if (error) throw new InternalServerErrorException(`RPC: ${error.message}`);
    return { ...(data ?? {}), staging_records: records.length };
  }

  // ── Helpers ────────────────────────────────────────────────

  private async finalizeBatch(batchId: string, total: number, valid: number, invalid: number) {
    const payload = {
      status: invalid > 0 && valid === 0 ? 'error' : 'done',
      total_rows: total,
      valid_rows: valid,
      invalid_rows: invalid,
      finished_at: new Date().toISOString(),
    };

    // Retry up to 3 times (Supabase intermittent Bad Gateway)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await this.supabase.admin
        .from('import_batches')
        .update(payload)
        .eq('id', batchId);
      if (!error) return;
      this.logger.warn(`finalizeBatch attempt ${attempt + 1} failed: ${error.message}`);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
    }
    this.logger.error(`finalizeBatch failed after 3 attempts for batch ${batchId}`);
  }

  private detectImportType(filename: string, content: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes('jersey') || lower.includes('planilha')) return 'snapshot';
    if (lower.includes('reno') || lower.includes('composi') || lower.includes('valor'))
      return 'financial';

    const sample = content.substring(0, 2000).toLowerCase();
    if (
      sample.includes('angaria') ||
      sample.includes('vendida') ||
      sample.includes('renegocia') ||
      sample.includes('cartório') ||
      sample.includes('cartorio')
    )
      return 'snapshot';
    if (sample.includes('financ') || sample.includes('fgts') || sample.includes('iptu'))
      return 'financial';

    return 'snapshot';
  }

  private detectSeparator(line: string): string {
    return (line.match(/;/g) || []).length > (line.match(/,/g) || []).length ? ';' : ',';
  }

  private parseRow(line: string, sep: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (c === sep && !inQ) {
        result.push(cur);
        cur = '';
      } else cur += c;
    }
    result.push(cur);
    return result;
  }

  private parseFlatCsv(content: string): Record<string, unknown>[] {
    const lines = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((l) => l.trim());
    if (lines.length < 2) throw new BadRequestException('CSV vazio');

    const sep = this.detectSeparator(lines[0]);
    const rawH = this.parseRow(lines[0], sep);
    const headers = rawH.map((h, i) => {
      const clean = h.replace(/^"|"$/g, '').replace(/[^a-zA-Z0-9_\u00C0-\u017F .-]/g, '').trim();
      return clean || `col_${i}`;
    });
    const seen = new Map<string, number>();
    const uHeaders = headers.map((h) => {
      const c = seen.get(h) ?? 0;
      seen.set(h, c + 1);
      return c > 0 ? `${h}_${c}` : h;
    });

    const records: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = this.parseRow(lines[i], sep);
      if (!vals.some((v) => v.trim())) continue;
      const row: Record<string, unknown> = {};
      uHeaders.forEach((h, idx) => {
        const v = vals[idx]?.trim();
        if (v) row[h] = v;
      });
      if (Object.keys(row).length > 0) records.push(row);
    }

    return records;
  }

  async processBatch(_batchId: string) {
    return { message: 'O processamento é feito automaticamente no upload.' };
  }
}

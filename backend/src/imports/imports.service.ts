import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import * as crypto from 'crypto';
import * as XLSX from 'xlsx';

import { ImportProcessorService } from './import-processor.service';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);
  private bucketReady = false;

  constructor(
    private supabase: SupabaseService,
    private processor: ImportProcessorService,
  ) {}

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

  async listSources() {
    const { data, error } = await this.supabase.admin
      .from('import_batches')
      .select(`
        id, source_name, import_type, status, total_rows, valid_rows,
        created_at, finished_at,
        file:uploaded_files(file_name)
      `)
      .eq('status', 'done')
      .not('import_type', 'eq', 'snapshot')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Count entities per batch
    const sources = [];
    for (const batch of (data || [])) {
      const [clients, units, processes] = await Promise.all([
        this.supabase.admin.from('clients').select('id', { count: 'exact', head: true }).eq('import_batch_id', batch.id),
        this.supabase.admin.from('units').select('id', { count: 'exact', head: true }).eq('import_batch_id', batch.id),
        this.supabase.admin.from('resale_processes').select('id', { count: 'exact', head: true }).eq('import_batch_id', batch.id),
      ]);
      sources.push({
        ...batch,
        clients_count: clients.count ?? 0,
        units_count: units.count ?? 0,
        processes_count: processes.count ?? 0,
      });
    }
    return sources;
  }

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
    // 1. Delete snapshots linked to this import batch
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
      // column may not exist yet
    }

    // 1b. Delete carteira snapshots linked to this import batch
    try {
      const { data: carteiraSnaps } = await this.supabase.admin
        .from('carteira_snapshots')
        .select('id')
        .eq('importacao_id', batchId);

      if (carteiraSnaps?.length) {
        const snapIds = carteiraSnaps.map(s => s.id);
        // Cascade: ajustes and audit reference itens, itens reference snapshots
        for (const snapId of snapIds) {
          await this.supabase.admin.from('carteira_snapshot_audit').delete().eq('snapshot_id', snapId);
        }
        for (const snapId of snapIds) {
          await this.supabase.admin.from('carteira_snapshot_itens').delete().eq('snapshot_id', snapId);
        }
        await this.supabase.admin.from('carteira_snapshots').delete().eq('importacao_id', batchId);
        this.logger.log(`Deleted ${snapIds.length} carteira snapshots for batch ${batchId}`);
      }
    } catch (err: any) {
      this.logger.warn(`Carteira snapshot cleanup for batch ${batchId}: ${err.message}`);
    }

    // 2. Delete CRM entities created by this batch (order matters: FKs)
    try {
      // Financial entries first (depends on processes)
      await this.supabase.admin
        .from('process_financial_entries')
        .delete()
        .eq('import_batch_id', batchId);

      // Process stage history for processes of this batch
      const { data: processIds } = await this.supabase.admin
        .from('resale_processes')
        .select('id')
        .eq('import_batch_id', batchId);

      if (processIds?.length) {
        const ids = processIds.map(p => p.id);
        for (let i = 0; i < ids.length; i += 50) {
          const chunk = ids.slice(i, i + 50);
          await this.supabase.admin
            .from('process_stage_history')
            .delete()
            .in('process_id', chunk);
        }
      }

      // Processes
      await this.supabase.admin
        .from('resale_processes')
        .delete()
        .eq('import_batch_id', batchId);

      // Units
      await this.supabase.admin
        .from('units')
        .delete()
        .eq('import_batch_id', batchId);

      // Clients
      await this.supabase.admin
        .from('clients')
        .delete()
        .eq('import_batch_id', batchId);

      this.logger.log(`Deleted CRM entities for batch ${batchId}`);
    } catch (err: any) {
      this.logger.warn(`CRM entity cleanup for batch ${batchId}: ${err.message}`);
    }

    // 3. Delete import tracking records
    await this.supabase.admin.from('import_batch_items').delete().eq('import_batch_id', batchId);
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

    // Detect if XLSX
    const isXlsx = /\.xlsx?$/i.test(file.originalname) ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    // Detect type
    let detectedType: string;
    let content = '';
    if (isXlsx) {
      detectedType = importType || this.detectXlsxImportType(file.buffer, file.originalname);
    } else {
      content = file.buffer.toString('utf-8');
      detectedType = importType || this.detectImportType(file.originalname, content);
    }
    this.logger.log(`Detected type: ${detectedType} (xlsx: ${isXlsx})`);

    // Detect source
    const lower = file.originalname.toLowerCase();
    const source = lower.includes('jersey') ? 'Jersey' : lower.includes('reno') ? 'Reno' : 'Import';

    // Create import batch
    const { data: batch, error: batchError } = await this.supabase.admin
      .from('import_batches')
      .insert({
        uploaded_file_id: uploadedFile.id,
        import_type: detectedType,
        status: 'pending',
        total_rows: 0,
        file_size: file.size,
        source_name: source,
        started_at: new Date().toISOString(),
        ...(sourceId ? { source_id: sourceId } : {}),
      })
      .select('id')
      .single();
    if (batchError) throw new InternalServerErrorException(`Erro criar lote: ${batchError.message}`);

    // Para importações XLSX detalhadas: processar em background
    if (isXlsx && detectedType === 'detailed') {
      // Guardar buffer para processamento assíncrono
      const bufferCopy = Buffer.from(file.buffer);
      setImmediate(() => {
        this.processor.processInBackground(batch.id, bufferCopy, file.originalname, detectedType, source)
          .catch(err => this.logger.error(`Background processing failed: ${err.message}`));
      });

      return {
        import_batch_id: batch.id,
        import_type: detectedType,
        status: 'processing',
        source,
        duplicate_warning: duplicateWarning,
        message: 'Importação iniciada. Acompanhe o status na lista de lotes.',
      };
    }

    // Para CSV/snapshot/financial: processar síncrono (rápido)
    try {
      let result: any;

      if (isXlsx && detectedType === 'snapshot') {
        const wb = XLSX.read(file.buffer, { type: 'buffer' });
        const pivotSheet = wb.SheetNames.find(n => /planilha7|evolu/i.test(n)) || wb.SheetNames[0];
        content = XLSX.utils.sheet_to_csv(wb.Sheets[pivotSheet]);
        result = await this.processSnapshotPivot(batch.id, content, file.originalname);
      } else {
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

  // ── XLSX Detailed Import (Jersey/Reno with individual records) ──

  private detectXlsxImportType(buffer: Buffer, filename: string): string {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = wb.SheetNames.map(s => s.toLowerCase());

    // Se tem aba com dados detalhados (USAR ESSA, ABA_GERAL, Planilha2, etc.)
    const hasDetailSheet = sheetNames.some(s =>
      s.includes('usar essa') || s.includes('aba_geral') || s.includes('planilha2') || s.includes('planilha3'),
    );

    if (hasDetailSheet) return 'detailed';

    // Fallback: check filename
    const lower = filename.toLowerCase();
    if (lower.includes('jersey') || lower.includes('planilha')) return 'snapshot';
    if (lower.includes('reno') || lower.includes('composi') || lower.includes('valor')) return 'financial';

    return 'detailed'; // Default para XLSX
  }

  private async processDetailedXlsx(importBatchId: string, buffer: Buffer, filename: string) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const lower = filename.toLowerCase();
    const source = lower.includes('jersey') ? 'Jersey' : lower.includes('reno') ? 'Reno' : 'Import';

    this.logger.log(`Processing ${filename} (source: ${source}, sheets: ${wb.SheetNames.join(', ')})`);

    // ════════════════════════════════════════════════════════
    // FASE 1: Ler TODAS as abas e unificar por Bl-Und
    // ════════════════════════════════════════════════════════

    const recordMap: Record<string, any> = {}; // bl_und → merged record

    // Helper: ler uma aba genérica e extrair dados por Bl-Und
    const parseSheet = (sheetName: string, blUndCol: number, headerRowIdx: number) => {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const headers = (data[headerRowIdx] || []).map((h: any) => String(h || '').trim());

      const colIdx = (name: string) => headers.findIndex(h =>
        h.toUpperCase() === name.toUpperCase() || h.toUpperCase().includes(name.toUpperCase()),
      );
      const get = (row: any[], name: string) => {
        const idx = colIdx(name);
        return idx >= 0 ? row[idx] : null;
      };
      const str = (v: any) => v ? String(v).trim() : '';

      let count = 0;
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        const blUnd = str(row[blUndCol]);
        if (!blUnd) continue;

        if (!recordMap[blUnd]) {
          recordMap[blUnd] = { bl_und: blUnd, _sheets: [] };
        }
        const r = recordMap[blUnd];
        r._sheets.push(sheetName);

        // Merge: só sobrescreve se o campo está vazio no record existente
        const merge = (key: string, val: any) => {
          if (val !== null && val !== undefined && val !== '' && val !== 0 && val !== '0') {
            if (!r[key] || r[key] === '' || r[key] === null) r[key] = val;
          }
        };
        const mergeNum = (key: string, val: any) => {
          const n = this.parseNum(val);
          if (n !== null && n !== 0) {
            if (!r[key] || r[key] === null) r[key] = n;
          }
        };

        // Campos comuns a todas as abas
        merge('enterprise_name', str(get(row, 'Empreendimento') || get(row, 'RECTO_EMPRDDESC')));
        merge('seller_name', str(get(row, 'Proponente') || get(row, 'RECTO_FORNRAZAO') || get(row, 'Cliente')));
        merge('seller_cpf', str(get(row, 'CPF') || get(row, 'RECTO_CPFCNPJ') || get(row, 'Documento do Cliente')));
        merge('seller_phone', str(get(row, 'TELEFONE') || get(row, 'TELEFONE 1') || get(row, 'Telefone 01') || get(row, 'Telefone') || get(row, 'Celular')));
        merge('seller_phone2', str(get(row, 'TELEFONE 2') || get(row, 'Telefone 02') || get(row, 'Celular')));
        merge('tipologia', str(get(row, 'Tipologia') || get(row, 'TIPOLOGIA') || get(row, 'DESCRIÇÃO')));
        merge('interesse', str(get(row, 'Interesse') || get(row, 'STATUS CLIENTE')));
        merge('status_raw', str(get(row, 'Status') || get(row, 'Situação do Repasse') || get(row, 'Situação da Reserva')));
        merge('agendamento', str(get(row, 'Agendamento')));
        merge('angariador', str(get(row, 'ANGARIADOR') || get(row, 'EQUIPE ANGARIADORA') || get(row, 'Corretor')));
        merge('associado', str(get(row, 'Nome - Documento do Associado')));
        merge('feedback', str(get(row, 'Feedback') || get(row, 'FEEDBACK')));
        merge('analista', str(get(row, 'ANALISTA')));
        merge('status_cobranca', str(get(row, 'STATUS SETOR COBRANÇA')));

        // Comprador
        merge('buyer_name', str(get(row, 'Novo proponente')));
        const lastCpfIdx = headers.lastIndexOf('CPF');
        if (lastCpfIdx > 3) merge('buyer_cpf', str(row[lastCpfIdx]));
        merge('cca', str(get(row, 'CCA')));

        // Endereço (do Repasse/Planilha4)
        merge('email', str(get(row, 'Email')));
        merge('cidade', str(get(row, 'Cidade')));
        merge('estado', str(get(row, 'Estado')));
        merge('endereco', str(get(row, 'Endereço')));
        merge('cep', str(get(row, 'Cep') || get(row, 'CEP')));
        merge('bairro', str(get(row, 'Bairro')));
        merge('renda', str(get(row, 'Renda') || get(row, 'Vlr. renda total')));
        merge('profissao', str(get(row, 'Profissão do Cliente')));

        // Repasse/contrato
        merge('situacao_repasse', str(get(row, 'Situação do Repasse') || get(row, 'Situação da Reserva')));
        merge('bloco', str(get(row, 'Bloco')));
        merge('unidade', str(get(row, 'Unidade')));
        merge('regiao', str(get(row, 'Região')));
        merge('imobiliaria', str(get(row, 'Imobiliária')));
        merge('correspondente', str(get(row, 'Correspondente')));
        merge('contrato', str(get(row, 'Contrato') || get(row, 'Nº do contrato')));
        merge('grupo_situacoes', str(get(row, 'Grupo de Situações')));
        merge('unidade_entregue', str(get(row, 'UNIDADE ENTREGUE') || get(row, 'Chaves') || get(row, 'CHAVE ENTREGUE')));
        merge('etapa', str(get(row, 'Etapa')));
        merge('sub_etapa', str(get(row, 'Sub_Etapa')));

        // CADIN
        mergeNum('cadin_imovel', get(row, 'Cadin - Imovel $') || get(row, 'CADIN'));
        mergeNum('cadin_outros', get(row, 'Cadin - Outros $'));

        // Financeiro
        mergeNum('valor_venda_inicial', get(row, 'Valor de venda Inicial') || get(row, 'VALOR DE VENDA') || get(row, 'Valor de venda') || get(row, 'Valor Final'));
        mergeNum('financiamento', get(row, 'Financiamento') || get(row, 'FINANCIAMENTO') || get(row, 'Valor financiado'));
        mergeNum('subsidio', get(row, 'Valor subsídio') || get(row, 'SUBSÍDIO EQUILÍBRIO') || get(row, 'Valor do subsídio'));
        mergeNum('fgts', get(row, 'Valor FGTS') || get(row, 'FGTS UTILIZADO') || get(row, 'Valor do FGTS'));
        mergeNum('financiamento_total', get(row, 'Financiamento Total') || get(row, 'SALDO TOTAL FINAL'));
        mergeNum('divida_inicial', get(row, 'Dívida Inicial') || get(row, 'Dívida Inicial (Confissão)') || get(row, 'DIVIDA INICIAL LYX') || get(row, 'Valor da dívida'));
        mergeNum('sinal', get(row, 'Sinal') || get(row, 'Sinal Pago'));
        mergeNum('quanto_pagou', get(row, 'Quanto já pagou') || get(row, 'QUANTO JÁ PAGOU') || get(row, 'Pago'));
        mergeNum('quanto_deve_lyx', get(row, 'Quanto deve LYX') || get(row, 'Saldo devedor - Parcela Lyx'));
        mergeNum('saldo_jdo', get(row, 'Saldo devedor JDO') || get(row, 'Saldo devedor - JDO') || get(row, 'SALDO JUROS DE OBRA'));
        mergeNum('jdo_pagou', get(row, 'JDO Cliente pagou p Lyx'));
        mergeNum('parcelas_jdo_atraso', get(row, 'PARCELAS JDO EM ATRASO'));
        mergeNum('vlr_doc', get(row, 'Vlr Doc') || get(row, 'Vlr. Documentação') || get(row, 'DOCUMENTAÇÃO'));
        mergeNum('laudo_valor', get(row, 'Laudo'));
        mergeNum('condominio', get(row, 'Cond'));
        mergeNum('iptu', get(row, 'IPTU'));
        mergeNum('iptu_2026', get(row, 'IPTU 2026') || get(row, 'IPTU 2026 SERÁ LANÇADO'));
        mergeNum('valor_venda_final', get(row, 'Valor de Venda final') || get(row, 'Valor final para venda') || get(row, 'Valor Final'));
        mergeNum('comissao', get(row, 'Comissão 6,5'));
        mergeNum('saldo_atraso', get(row, 'SALDO EM ATRASO'));
        mergeNum('saldo_futuro', get(row, 'SALDO FUTURO'));
        mergeNum('valor_contrato', get(row, 'Valor Contrato'));
        mergeNum('saldo_devedor', get(row, 'Saldo devedor'));
        mergeNum('valor_avaliacao', get(row, 'Valor de avaliação'));
        mergeNum('valor_imovel', get(row, 'Valor do imóvel'));

        // Gerente/extras Reno
        merge('gerente', str(get(row, 'Gerente')));
        merge('pre_cadastro', str(get(row, 'Pré Cadastro')));

        count++;
      }
      this.logger.log(`  Sheet "${sheetName}": ${count} rows processed`);
    };

    // ── Ler abas Jersey ──
    if (source === 'Jersey') {
      // Aba principal
      if (wb.Sheets['USAR ESSA']) parseSheet('USAR ESSA', 0, 1);
      // Aba antiga (mesmos dados + etapa/sub_etapa)
      if (wb.Sheets['Antiga']) parseSheet('Antiga', 0, 1);
      // Planilha2 (55 unidades extras + dados financeiros diferentes)
      if (wb.Sheets['Planilha2']) parseSheet('Planilha2', 0, 0);
      // Planilha3 (dados complementares)
      if (wb.Sheets['Planilha3']) parseSheet('Planilha3', 0, 1);
      // Repasse (816 unidades = dados completos de contrato, endereço, email, renda, profissão)
      if (wb.Sheets['Repasse']) parseSheet('Repasse', 0, 0);
    }

    // ── Ler abas Reno ──
    if (source === 'Reno') {
      if (wb.Sheets['ABA_GERAL']) parseSheet('ABA_GERAL', 0, 1);
      if (wb.Sheets['retorno 1 cobrança']) parseSheet('retorno 1 cobrança', 0, 0);
      if (wb.Sheets['Ultima Dai']) parseSheet('Ultima Dai', 0, 0);
      if (wb.Sheets['Repasse CV']) parseSheet('Repasse CV', 0, 0);
      // Planilha4 tem formato diferente (sem Bl-Und, usa CPF como chave)
      // Enriquecer endereço via CPF
      if (wb.Sheets['Planilha4']) {
        const ws = wb.Sheets['Planilha4'];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const seen = new Set<string>();
        for (let i = 1; i < data.length; i++) {
          const cpf = this.normDoc(String(data[i][2] || ''));
          const ref = String(data[i][7] || '');
          if (!cpf || seen.has(cpf) || !ref.includes('Titular')) continue;
          seen.add(cpf);
          // Encontrar record por CPF
          for (const r of Object.values(recordMap)) {
            if (this.normDoc(r.seller_cpf) === cpf) {
              if (!r.endereco) r.endereco = String(data[i][9] || '').trim();
              if (!r.bairro) r.bairro = String(data[i][10] || '').trim();
              if (!r.cidade) r.cidade = String(data[i][11] || '').trim();
              if (!r.cep) r.cep = String(data[i][12] || '').trim();
              if (!r.seller_phone) r.seller_phone = String(data[i][8] || '').trim();
              break;
            }
          }
        }
        this.logger.log(`  Sheet "Planilha4": ${seen.size} endereços enriquecidos por CPF`);
      }
    }

    // Fallback: se nenhuma aba foi detectada, tentar a primeira aba com dados
    if (Object.keys(recordMap).length === 0) {
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const headers = (data[0] || []).map((h: any) => String(h || '').trim());
        if (headers.some(h => /bl.*un|unid/i.test(h)) && headers.some(h => /cpf|proponente|cliente/i.test(h))) {
          parseSheet(name, 0, 0);
          if (Object.keys(recordMap).length > 0) break;
        }
      }
    }

    const records = Object.values(recordMap);
    this.logger.log(`Total unified records: ${records.length} from ${wb.SheetNames.length} sheets`);

    this.logger.log(`Parsed ${records.length} records from "${wb.SheetNames.join(', ')}"`);
    if (records.length === 0) {
      await this.finalizeBatch(importBatchId, 0, 0, 0);
      return { total_rows: 0, valid_rows: 0 };
    }

    // ── Create enterprises ──
    const enterpriseNames = [...new Set(records.map(r => r.enterprise_name).filter(Boolean))];
    const enterpriseMap: Record<string, string> = {};

    for (const name of enterpriseNames) {
      const code = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').substring(0, 50);
      const { data: existing } = await this.supabase.admin
        .from('enterprises').select('id').eq('code', code).maybeSingle();

      if (existing) {
        enterpriseMap[name] = existing.id;
      } else {
        const { data: created } = await this.supabase.admin
          .from('enterprises')
          .insert({ name, code, status: 'active', notes: 'Importado de XLSX' })
          .select('id').single();
        if (created) enterpriseMap[name] = created.id;
      }
    }

    // ── Create clients (BATCH — dedup by CPF → phone → name) ──
    const clientMap: Record<string, string> = {};
    const seenClients = new Set<string>();
    const clientBatch: { _key: string; [k: string]: any }[] = [];

    for (const r of records) {
      const normDoc = this.normDoc(r.seller_cpf);
      const normPhone = this.normPhone(r.seller_phone);
      const dedupKey = normDoc || normPhone || (r.seller_name ? r.seller_name.toLowerCase().trim() : null);
      if (!dedupKey || seenClients.has(dedupKey)) continue;
      seenClients.add(dedupKey);
      clientBatch.push({
        _key: dedupKey,
        full_name: r.seller_name || 'Cliente sem nome',
        document_number: normDoc,
        document_type: normDoc ? (normDoc.length === 11 ? 'cpf' : 'cnpj') : null,
        phone: normPhone,
        phone_secondary: this.normPhone(r.seller_phone2) || null,
        email: r.email ? r.email.toLowerCase() : null,
        address_street: r.endereco || null,
        address_neighborhood: r.bairro || null,
        address_city: r.cidade || null,
        address_state: r.estado && r.estado.length === 2 ? r.estado : null,
        address_zip: r.cep || null,
        client_type: 'seller',
        status: 'active',
        import_batch_id: importBatchId,
        notes: [
          `Importado de ${source} XLSX`,
          r.profissao ? `Profissão: ${r.profissao}` : null,
          r.renda ? `Renda: ${r.renda}` : null,
        ].filter(Boolean).join(' | '),
      });
    }

    // Buyer clients
    for (const r of records) {
      if (!r.buyer_name) continue;
      const buyerDoc = this.normDoc(r.buyer_cpf);
      const buyerKey = buyerDoc || r.buyer_name.toLowerCase().trim();
      if (seenClients.has(buyerKey)) continue;
      seenClients.add(buyerKey);
      clientBatch.push({
        _key: buyerKey,
        full_name: r.buyer_name,
        document_number: buyerDoc,
        document_type: buyerDoc ? (buyerDoc.length === 11 ? 'cpf' : 'cnpj') : null,
        phone: null,
        client_type: 'buyer',
        status: 'active',
        import_batch_id: importBatchId,
        notes: `Importado de ${source} XLSX (comprador)`,
      });
    }

    // Batch insert clients (50 at a time)
    for (let i = 0; i < clientBatch.length; i += 50) {
      const chunk = clientBatch.slice(i, i + 50);
      const rows = chunk.map(({ _key, ...rest }) => rest);
      try {
        const { data: inserted } = await this.supabase.admin
          .from('clients').insert(rows).select('id');
        if (inserted) {
          for (let j = 0; j < inserted.length; j++) {
            clientMap[chunk[j]._key] = inserted[j].id;
          }
        }
      } catch (err: any) {
        this.logger.error(`Client batch ${i}: ${err.message}`);
        // Fallback: insert one by one
        for (const c of chunk) {
          try {
            const { _key, ...rest } = c;
            const { data } = await this.supabase.admin.from('clients').insert(rest).select('id').single();
            if (data) clientMap[_key] = data.id;
          } catch { /* skip duplicate */ }
        }
      }
    }

    const clientsCreated = Object.keys(clientMap).length;
    this.logger.log(`Clients: ${clientsCreated}`);

    // ── Create units (BATCH) ──
    const unitMap: Record<string, string> = {};
    const unitBatch: { _key: string; [k: string]: any }[] = [];
    const seenUnits = new Set<string>();

    for (const r of records) {
      if (seenUnits.has(r.bl_und)) continue;
      seenUnits.add(r.bl_und);

      const { block, unit } = this.parseBlUnd(r.bl_und);
      const normDoc = this.normDoc(r.seller_cpf);
      const normPhone = this.normPhone(r.seller_phone);
      const dedupKey = normDoc || normPhone || (r.seller_name ? r.seller_name.toLowerCase().trim() : null);
      const sellerId = dedupKey ? clientMap[dedupKey] : null;
      const buyerKey = r.buyer_name ? (this.normDoc(r.buyer_cpf) || r.buyer_name.toLowerCase().trim()) : null;
      const buyerId = buyerKey ? clientMap[buyerKey] : null;

      let unitStatus = 'in_resale';
      if ((r.interesse || '').toLowerCase().includes('vendida')) unitStatus = 'sold';

      const areaMatch = (r.tipologia || '').match(/([\d,.]+)\s*m²/);
      const area = areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : null;
      const floorMatch = (unit || '').match(/(\d)\d{2}$/);
      const floor = floorMatch ? floorMatch[1] : null;

      unitBatch.push({
        _key: r.bl_und,
        enterprise_id: enterpriseMap[r.enterprise_name] || null,
        block_tower: block,
        unit_number: unit || r.bl_und,
        floor,
        unit_type: (r.tipologia || '').toLowerCase().includes('garden') ? 'house' : 'apartment',
        area_m2: area,
        original_value: r.valor_venda_inicial,
        current_value: r.valor_venda_final || r.valor_venda_inicial,
        status: unitStatus,
        original_client_id: sellerId,
        current_client_id: buyerId || sellerId,
        debts_cadin: ((r.cadin_imovel || 0) + (r.cadin_outros || 0)) || null,
        debts_iptu: (r.iptu || 0) + (r.iptu_2026 || 0) || null,
        debts_condominio: r.condominio,
        debts_other: r.valores_jdo,
        debts_description: [r.chaves ? `Chaves: ${r.chaves}` : null, r.associado ? `Associado: ${r.associado}` : null].filter(Boolean).join(' | ') || null,
        import_batch_id: importBatchId,
        notes: `${source} | ${r.bl_und} | Tipologia: ${r.tipologia || 'N/A'} | Interesse: ${r.interesse || 'N/A'} | Status: ${r.status_raw || 'N/A'} | Angariador: ${r.angariador || 'N/A'}`,
      });
    }

    for (let i = 0; i < unitBatch.length; i += 50) {
      const chunk = unitBatch.slice(i, i + 50);
      const rows = chunk.map(({ _key, ...rest }) => rest);
      try {
        const { data: inserted } = await this.supabase.admin.from('units').insert(rows).select('id');
        if (inserted) {
          for (let j = 0; j < inserted.length; j++) {
            unitMap[chunk[j]._key] = inserted[j].id;
          }
        }
      } catch (err: any) {
        this.logger.error(`Unit batch ${i}: ${err.message}`);
        for (const u of chunk) {
          try {
            const { _key, ...rest } = u;
            const { data } = await this.supabase.admin.from('units').insert(rest).select('id').single();
            if (data) unitMap[_key] = data.id;
          } catch { /* skip */ }
        }
      }
    }

    this.logger.log(`Units: ${Object.keys(unitMap).length}`);

    // ── Get flow types ──
    const { data: flowTypes } = await this.supabase.admin
      .from('resale_flow_types').select('id,code');
    const standardFlow = flowTypes?.find(f => f.code === 'standard');
    const jerseyFlow = flowTypes?.find(f => f.code === 'jersey_city');

    let standardFirstStage: string | null = null;
    let jerseyFirstStage: string | null = null;

    if (standardFlow) {
      const { data: stages } = await this.supabase.admin
        .from('flow_stages').select('id').eq('flow_type_id', standardFlow.id).order('stage_order').limit(1);
      standardFirstStage = stages?.[0]?.id ?? null;
    }
    if (jerseyFlow) {
      const { data: stages } = await this.supabase.admin
        .from('flow_stages').select('id').eq('flow_type_id', jerseyFlow.id).order('stage_order').limit(1);
      jerseyFirstStage = stages?.[0]?.id ?? null;
    }

    // ── Get financial components ──
    const { data: components } = await this.supabase.admin
      .from('resale_financial_components').select('id,code');
    const compMap: Record<string, string> = {};
    for (const c of (components || [])) compMap[c.code] = c.id;

    // ── Create processes (BATCH) + financial entries ──
    let processesCreated = 0;
    let financialCreated = 0;

    // Prepare all process rows
    const processBatch: { _idx: number; _record: any; row: any }[] = [];

    for (let idx = 0; idx < records.length; idx++) {
      const r = records[idx];
      const normDoc = this.normDoc(r.seller_cpf);
      const normPhone = this.normPhone(r.seller_phone);
      const dedupKey = normDoc || normPhone || (r.seller_name ? r.seller_name.toLowerCase().trim() : null);
      const sellerId = dedupKey ? clientMap[dedupKey] : null;
      const buyerKey = r.buyer_name ? (this.normDoc(r.buyer_cpf) || r.buyer_name.toLowerCase().trim()) : null;
      const buyerId = buyerKey ? clientMap[buyerKey] : null;
      const unitId = unitMap[r.bl_und] || null;

      const isJersey = source === 'Jersey';
      const flowId = isJersey ? (jerseyFlow?.id || standardFlow?.id) : standardFlow?.id;
      const firstStage = isJersey ? (jerseyFirstStage || standardFirstStage) : standardFirstStage;
      if (!flowId || !firstStage) {
        this.logger.warn(`Skip record ${idx} (${r.bl_und}): no flow type`);
        continue;
      }

      const processStatus = (r.interesse || '').toLowerCase().includes('vendida') ? 'completed' : 'active';

      const processNotes = [
        `Fonte: ${source}`, `Unidade: ${r.bl_und}`,
        r.interesse ? `Interesse: ${r.interesse}` : null,
        r.status_raw ? `Status: ${r.status_raw}` : null,
        r.angariador ? `Angariador: ${r.angariador}` : null,
        r.agendamento ? `Agendamento: ${r.agendamento}` : null,
        r.associado ? `Associado: ${r.associado}` : null,
        r.cca ? `CCA: ${r.cca}` : null,
        r.gerente ? `Gerente: ${r.gerente}` : null,
        r.pre_cadastro ? `Pré-Cadastro: ${r.pre_cadastro}` : null,
        r.chaves ? `Chaves: ${r.chaves}` : null,
        r.parcelas_jdo_atraso ? `Parcelas JDO em atraso: ${r.parcelas_jdo_atraso}` : null,
      ].filter(Boolean).join(' | ');

      processBatch.push({
        _idx: idx,
        _record: r,
        row: {
          flow_type_id: flowId,
          unit_id: unitId,
          seller_client_id: sellerId,
          buyer_client_id: buyerId,
          current_stage_id: firstStage,
          status: processStatus,
          priority: 'normal',
          import_batch_id: importBatchId,
          notes: processNotes,
        },
      });
    }

    // Insert processes in batches of 50
    const processIdMap: Record<number, string> = {}; // idx → process_id

    for (let i = 0; i < processBatch.length; i += 50) {
      const chunk = processBatch.slice(i, i + 50);
      const rows = chunk.map(p => p.row);
      try {
        const { data: inserted, error } = await this.supabase.admin
          .from('resale_processes').insert(rows).select('id');
        if (error) throw error;
        if (inserted) {
          for (let j = 0; j < inserted.length; j++) {
            processIdMap[chunk[j]._idx] = inserted[j].id;
            processesCreated++;
          }
        }
      } catch (err: any) {
        this.logger.error(`Process batch ${i}: ${err.message}`);
        // Fallback: one by one
        for (const p of chunk) {
          try {
            const { data } = await this.supabase.admin.from('resale_processes').insert(p.row).select('id').single();
            if (data) { processIdMap[p._idx] = data.id; processesCreated++; }
          } catch (e2: any) {
            this.logger.error(`Process ${p._record.bl_und}: ${e2.message}`);
          }
        }
      }
    }

    this.logger.log(`Processes: ${processesCreated}`);

    // ── Financial entries (BATCH) ──
    const financialBatch: any[] = [];

    this.logger.log(`Building financial entries. processBatch: ${processBatch.length}, processIdMap keys: ${Object.keys(processIdMap).length}, compMap keys: ${Object.keys(compMap).join(',')}`);

    for (const p of processBatch) {
      const processId = processIdMap[p._idx];
      if (!processId) continue;
      const r = p._record;

      // Entries com componente
      const mapped = [
        { code: 'valor_venda', amount: r.valor_venda_final || r.valor_venda_inicial, type: 'receivable', desc: 'Valor de venda' },
        { code: 'financiamento', amount: r.financiamento, type: 'receivable', desc: 'Financiamento' },
        { code: 'subsidio', amount: r.subsidio, type: 'receivable', desc: 'Subsídio' },
        { code: 'fgts', amount: r.fgts, type: 'receivable', desc: 'FGTS' },
        { code: 'endividamento', amount: r.quanto_deve_lyx, type: 'payable', desc: 'Dívida LYX' },
        { code: 'jdo', amount: r.saldo_jdo, type: 'payable', desc: 'Saldo JDO' },
        { code: 'documentacao', amount: r.vlr_doc, type: 'payable', desc: 'Documentação' },
        { code: 'laudo', amount: r.laudo_valor, type: 'payable', desc: 'Laudo' },
        { code: 'iptu', amount: (r.iptu || 0) + (r.iptu_2026 || 0) || null, type: 'payable', desc: 'IPTU' },
        { code: 'comissao', amount: r.comissao, type: 'payable', desc: 'Comissão 6,5%' },
      ];

      for (const e of mapped) {
        if (e.amount && compMap[e.code]) {
          financialBatch.push({
            process_id: processId, component_id: compMap[e.code],
            entry_type: e.type, amount: e.amount, description: e.desc,
            payment_status: 'pending', import_batch_id: importBatchId,
            notes: `Importado de ${source} XLSX`,
          });
        }
      }

      // Extras sem componente específico
      const extras = [
        r.divida_inicial ? { desc: 'Dívida inicial', amount: r.divida_inicial, type: 'payable', status: 'pending' } : null,
        r.sinal ? { desc: 'Sinal pago', amount: r.sinal, type: 'received', status: 'paid' } : null,
        r.quanto_pagou ? { desc: 'Quanto já pagou', amount: r.quanto_pagou, type: 'received', status: 'paid' } : null,
        r.jdo_pagou ? { desc: 'JDO pagou p/ Lyx', amount: r.jdo_pagou, type: 'received', status: 'paid' } : null,
        r.condominio ? { desc: 'Condomínio', amount: r.condominio, type: 'payable', status: 'pending' } : null,
      ].filter(Boolean);

      for (const e of extras) {
        if (!e) continue;
        financialBatch.push({
          process_id: processId, component_id: compMap['valor_venda'] || Object.values(compMap)[0],
          entry_type: e.type, amount: e.amount, description: e.desc,
          payment_status: e.status, import_batch_id: importBatchId,
          notes: `Importado de ${source} XLSX`,
        });
      }
    }

    this.logger.log(`Financial batch prepared: ${financialBatch.length} entries`);
    if (financialBatch.length > 0) {
      this.logger.log(`Sample entry: ${JSON.stringify(financialBatch[0])}`);
    } else if (processBatch.length > 0) {
      // Debug: why no entries?
      const sample = processBatch[0]._record;
      this.logger.warn(`No financial entries! Sample record financial fields: valor_venda_inicial=${sample.valor_venda_inicial}, financiamento=${sample.financiamento}, subsidio=${sample.subsidio}`);
    }

    // Insert financial in batches of 100
    for (let i = 0; i < financialBatch.length; i += 100) {
      const chunk = financialBatch.slice(i, i + 100);
      try {
        const { data: inserted, error } = await this.supabase.admin
          .from('process_financial_entries').insert(chunk).select('id');
        if (error) this.logger.error(`Financial batch ${i}: ${error.message}`);
        financialCreated += inserted?.length ?? 0;
      } catch (err: any) {
        this.logger.error(`Financial batch ${i}: ${err.message}`);
      }
    }

    this.logger.log(`Financial: ${financialCreated}`);

    // Update enterprise unit counts
    for (const [, eId] of Object.entries(enterpriseMap)) {
      const { count } = await this.supabase.admin
        .from('units').select('id', { count: 'exact', head: true }).eq('enterprise_id', eId);
      await this.supabase.admin.from('enterprises').update({ total_units: count ?? 0 }).eq('id', eId);
    }

    await this.finalizeBatch(importBatchId, records.length, processesCreated, records.length - processesCreated);

    return {
      total_rows: records.length,
      valid_rows: processesCreated,
      clients_created: clientsCreated,
      enterprises_created: enterpriseNames.length,
      units_created: Object.keys(unitMap).length,
      processes_created: processesCreated,
      financial_entries: financialCreated,
      source,
      sheet: wb.SheetNames.join(', '),
    };
  }

  // ── XLSX/CRM value helpers ────────────────────────────────

  private parseNum(val: any): number | null {
    if (val === null || val === undefined || val === '' || val === '#N/A') return null;
    const s = String(val).replace(/[R$\s]/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  private normDoc(doc: any): string | null {
    if (!doc) return null;
    const digits = String(doc).replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) return null;
    if (digits.length === 11 && /^(.)\1{10}$/.test(digits)) return null;
    return digits;
  }

  private normPhone(phone: any): string | null {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 11) return '55' + digits;
    if (digits.length === 10) return '55' + digits;
    if (digits.length >= 12 && digits.startsWith('55')) return digits;
    if (digits.length < 10) return null;
    return digits;
  }

  private parseBlUnd(blUnd: string): { block: string | null; unit: string | null } {
    const s = String(blUnd).trim();
    const match = s.match(/^(\d+)-(\d+)$/);
    if (match) return { block: 'BLOCO ' + match[1], unit: 'AP ' + match[2] };
    return { block: null, unit: s };
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

  // ── Batch Status (para polling do frontend) ──

  async getBatchStatus(batchId: string) {
    const { data, error } = await this.supabase.admin
      .from('import_batches')
      .select(`
        id, import_type, status, total_rows, valid_rows, invalid_rows,
        duplicate_count, replaced_count, processing_time_ms, file_size,
        source_name, error_summary, started_at, finished_at, created_at,
        file:uploaded_files(file_name, mime_type)
      `)
      .eq('id', batchId)
      .single();

    if (error || !data) throw new NotFoundException('Batch não encontrado');
    return data;
  }

  // ── Batch Items (auditoria por linha) ──

  async getBatchItems(batchId: string, status?: string) {
    let qb = this.supabase.admin
      .from('import_batch_items')
      .select('id, row_number, bl_und, sheet_name, validation_status, validation_errors, entity_type, entity_id, created_at')
      .eq('import_batch_id', batchId)
      .order('row_number');

    if (status) qb = qb.eq('validation_status', status);

    const { data, error } = await qb.limit(500);
    if (error) throw error;
    return data;
  }

  // ── Migração Resales → CRM ────────────────────────────────

  async previewMigration() {
    const { data, error } = await this.supabase.admin.rpc('preview_resales_migration');
    if (error) throw new InternalServerErrorException(`Preview: ${error.message}`);
    return data;
  }

  async migrateResalesToCrm(force = false) {
    const { data, error } = await this.supabase.admin.rpc('migrate_resales_to_crm', {
      p_force: force,
    });
    if (error) throw new InternalServerErrorException(`Migração: ${error.message}`);
    return data;
  }
}

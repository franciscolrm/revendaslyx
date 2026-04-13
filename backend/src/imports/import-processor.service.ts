import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { normalizeText, normalizeGroupName, extractDateFromHeader, findColumn } from '@/common/utils/text-matching';
import * as XLSX from 'xlsx';

interface BatchCounters {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateCount: number;
  replacedCount: number;
  clientsCreated: number;
  unitsCreated: number;
  processesCreated: number;
  financialCreated: number;
  errors: string[];
}

@Injectable()
export class ImportProcessorService {
  private readonly logger = new Logger(ImportProcessorService.name);

  constructor(private supabase: SupabaseService) {}

  // ── Entry point: chamado via setImmediate após HTTP response ──

  async processInBackground(
    batchId: string,
    buffer: Buffer,
    filename: string,
    importType: string,
    source: string,
  ) {
    const startTime = Date.now();
    const counters: BatchCounters = {
      totalRows: 0, validRows: 0, invalidRows: 0,
      duplicateCount: 0, replacedCount: 0,
      clientsCreated: 0, unitsCreated: 0,
      processesCreated: 0, financialCreated: 0,
      errors: [],
    };

    try {
      await this.updateBatchStatus(batchId, 'processing');

      if (importType === 'detailed') {
        await this.processDetailedXlsx(batchId, buffer, filename, source, counters);
      } else if (importType === 'snapshot') {
        const content = this.getContentFromBuffer(buffer, filename);
        await this.processSnapshot(batchId, content, filename, counters);
      } else {
        counters.errors.push(`Tipo de importação desconhecido: ${importType}`);
      }

      // Finalizar com sucesso
      await this.finalizeBatch(batchId, startTime, counters, 'done');
      this.logger.log(`Import ${batchId} completed: ${counters.validRows}/${counters.totalRows} rows`);
    } catch (err: any) {
      counters.errors.push(err.message);
      await this.finalizeBatch(batchId, startTime, counters, 'error');
      this.logger.error(`Import ${batchId} failed: ${err.message}`);
    }
  }

  // ── Status updates para polling ──

  private async updateBatchStatus(batchId: string, status: string, partial?: Partial<BatchCounters>) {
    const payload: any = { status };
    if (partial) {
      payload.valid_rows = partial.validRows ?? 0;
      payload.total_rows = partial.totalRows ?? 0;
      payload.invalid_rows = partial.invalidRows ?? 0;
      payload.duplicate_count = partial.duplicateCount ?? 0;
    }
    await this.supabase.admin.from('import_batches').update(payload).eq('id', batchId);
  }

  private async finalizeBatch(batchId: string, startTime: number, counters: BatchCounters, status: string) {
    const payload = {
      status,
      total_rows: counters.totalRows,
      valid_rows: counters.validRows,
      invalid_rows: counters.invalidRows,
      duplicate_count: counters.duplicateCount,
      replaced_count: counters.replacedCount,
      processing_time_ms: Date.now() - startTime,
      finished_at: new Date().toISOString(),
      error_summary: counters.errors.length > 0 ? {
        count: counters.errors.length,
        messages: counters.errors.slice(0, 50),
        clients_created: counters.clientsCreated,
        units_created: counters.unitsCreated,
        processes_created: counters.processesCreated,
        financial_created: counters.financialCreated,
      } : null,
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await this.supabase.admin
        .from('import_batches').update(payload).eq('id', batchId);
      if (!error) return;
      this.logger.warn(`finalizeBatch attempt ${attempt + 1}: ${error.message}`);
      if (attempt < 2) await this.sleep(1000);
    }
    this.logger.error(`finalizeBatch FAILED for ${batchId} after 3 attempts`);
  }

  // ── XLSX Detalhado: lê TODAS as abas, dedup, insere ──

  private async processDetailedXlsx(
    batchId: string, buffer: Buffer, filename: string, source: string, counters: BatchCounters,
  ) {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer' });
    } catch (err: any) {
      throw new Error(`Arquivo XLSX inválido ou corrompido: ${err.message}`);
    }

    this.logger.log(`Processing ${filename} (${source}), sheets: ${wb.SheetNames.join(', ')}`);

    // ── FASE 1: Ler todas as abas e unificar por Bl-Und ──
    const recordMap: Record<string, any> = {};

    const parseSheet = (sheetName: string, blUndCol: number, headerRowIdx: number) => {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const headers = (data[headerRowIdx] || []).map((h: any) => String(h || '').trim());

      const colIdx = (name: string) => findColumn(headers, name);
      const get = (row: any[], name: string) => {
        const idx = findColumn(headers, name);
        return idx >= 0 ? row[idx] : null;
      };
      const str = (v: any) => v ? String(v).trim() : '';

      let count = 0;
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        const blUnd = str(row[blUndCol]);
        if (!blUnd) continue;

        if (!recordMap[blUnd]) recordMap[blUnd] = { bl_und: blUnd, _sheets: [] };
        const r = recordMap[blUnd];
        r._sheets.push(sheetName);

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

        // ── Dados base ──
        merge('enterprise_name', str(get(row, 'Empreendimento') || get(row, 'RECTO_EMPRDDESC')));
        merge('seller_name', str(get(row, 'Proponente') || get(row, 'RECTO_FORNRAZAO') || get(row, 'Cliente')));
        merge('seller_cpf', str(get(row, 'CPF') || get(row, 'RECTO_CPFCNPJ') || get(row, 'Documento do Cliente')));
        merge('seller_phone', str(get(row, 'TELEFONE') || get(row, 'TELEFONE 1') || get(row, 'Telefone 01') || get(row, 'Telefone') || get(row, 'Celular')));
        merge('seller_phone2', str(get(row, 'TELEFONE 2') || get(row, 'Telefone 02') || get(row, 'Celular')));
        merge('email', str(get(row, 'Email')));
        merge('tipologia', str(get(row, 'Tipologia') || get(row, 'TIPOLOGIA') || get(row, 'DESCRIÇÃO')));
        merge('interesse', str(get(row, 'Interesse') || get(row, 'STATUS CLIENTE')));
        merge('status_raw', str(get(row, 'Status') || get(row, 'Situação do Repasse') || get(row, 'Situação da Reserva')));
        merge('agendamento', str(get(row, 'Agendamento')));
        merge('angariador', str(get(row, 'ANGARIADOR') || get(row, 'EQUIPE ANGARIADORA') || get(row, 'Corretor')));
        merge('associado', str(get(row, 'Nome - Documento do Associado')));
        merge('feedback', str(get(row, 'Feedback') || get(row, 'FEEDBACK')));
        merge('buyer_name', str(get(row, 'Novo proponente')));
        const lastCpfIdx = headers.lastIndexOf('CPF');
        if (lastCpfIdx > 3) merge('buyer_cpf', str(row[lastCpfIdx]));
        merge('cca', str(get(row, 'CCA')));

        // ── Endereço ──
        merge('cidade', str(get(row, 'Cidade')));
        merge('estado', str(get(row, 'Estado')));
        merge('endereco', str(get(row, 'Endereço')));
        merge('cep', str(get(row, 'Cep') || get(row, 'CEP')));
        merge('bairro', str(get(row, 'Bairro')));
        merge('renda', str(get(row, 'Renda') || get(row, 'Vlr. renda total')));
        merge('profissao', str(get(row, 'Profissão do Cliente')));

        // ── Repasse ──
        merge('situacao_repasse', str(get(row, 'Situação do Repasse') || get(row, 'Situação da Reserva')));
        merge('imobiliaria', str(get(row, 'Imobiliária')));
        merge('correspondente', str(get(row, 'Correspondente')));
        merge('contrato', str(get(row, 'Contrato') || get(row, 'Nº do contrato')));
        merge('grupo_situacoes', str(get(row, 'Grupo de Situações')));
        merge('unidade_entregue', str(get(row, 'UNIDADE ENTREGUE') || get(row, 'Chaves') || get(row, 'CHAVE ENTREGUE')));
        merge('etapa', str(get(row, 'Etapa')));
        merge('sub_etapa', str(get(row, 'Sub_Etapa')));
        merge('gerente', str(get(row, 'Gerente')));

        // ── Financeiro ──
        mergeNum('cadin_imovel', get(row, 'Cadin - Imovel $') || get(row, 'CADIN'));
        mergeNum('cadin_outros', get(row, 'Cadin - Outros $'));
        mergeNum('valor_venda_inicial', get(row, 'Valor de venda Inicial') || get(row, 'VALOR DE VENDA') || get(row, 'Valor de venda'));
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
        mergeNum('valor_avaliacao', get(row, 'Valor de avaliação'));

        count++;
      }
      this.logger.log(`  ${sheetName}: ${count} rows`);
    };

    // Ler abas por source
    if (source === 'Jersey') {
      if (wb.Sheets['USAR ESSA']) parseSheet('USAR ESSA', 0, 1);
      if (wb.Sheets['Antiga']) parseSheet('Antiga', 0, 1);
      if (wb.Sheets['Planilha2']) parseSheet('Planilha2', 0, 0);
      if (wb.Sheets['Planilha3']) parseSheet('Planilha3', 0, 1);
      if (wb.Sheets['Repasse']) parseSheet('Repasse', 0, 0);
    } else if (source === 'Reno') {
      if (wb.Sheets['ABA_GERAL']) parseSheet('ABA_GERAL', 0, 1);
      if (wb.Sheets['retorno 1 cobrança']) parseSheet('retorno 1 cobrança', 0, 0);
      if (wb.Sheets['Ultima Dai']) parseSheet('Ultima Dai', 0, 0);
      if (wb.Sheets['Repasse CV']) parseSheet('Repasse CV', 0, 0);
      // Planilha4: enriquecer endereço por CPF
      if (wb.Sheets['Planilha4']) {
        const data: any[][] = XLSX.utils.sheet_to_json(wb.Sheets['Planilha4'], { header: 1, defval: '' });
        const seen = new Set<string>();
        for (let i = 1; i < data.length; i++) {
          const cpf = this.normDoc(String(data[i][2] || ''));
          const ref = String(data[i][7] || '');
          if (!cpf || seen.has(cpf) || !ref.includes('Titular')) continue;
          seen.add(cpf);
          for (const r of Object.values(recordMap)) {
            if (this.normDoc(r.seller_cpf) === cpf) {
              if (!r.endereco) r.endereco = String(data[i][9] || '').trim();
              if (!r.bairro) r.bairro = String(data[i][10] || '').trim();
              if (!r.cidade) r.cidade = String(data[i][11] || '').trim();
              if (!r.cep) r.cep = String(data[i][12] || '').trim();
              break;
            }
          }
        }
      }
    } else {
      // Fallback: tentar primeira aba com Bl-Und
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const headers = (data[0] || []).map((h: any) => String(h || '').trim());
        if (headers.some(h => /bl.*un|unid/i.test(h))) {
          parseSheet(name, 0, 0);
          if (Object.keys(recordMap).length > 0) break;
        }
      }
    }

    const records = Object.values(recordMap);
    counters.totalRows = records.length;
    this.logger.log(`Total unified records: ${records.length}`);

    if (records.length === 0) return;

    // ── FASE 2: Criar enterprises ──
    const enterpriseNames = [...new Set(records.map(r => r.enterprise_name).filter(Boolean))];
    const enterpriseMap: Record<string, string> = {};
    for (const name of enterpriseNames) {
      const code = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').substring(0, 50);
      const { data: existing } = await this.supabase.admin
        .from('enterprises').select('id').eq('code', code).maybeSingle();
      if (existing) { enterpriseMap[name] = existing.id; continue; }
      const { data: created } = await this.supabase.admin
        .from('enterprises').insert({ name, code, status: 'active', notes: 'Importado de XLSX' }).select('id').single();
      if (created) enterpriseMap[name] = created.id;
    }

    // ── FASE 3: Criar/atualizar clientes (DEDUP) ──
    const clientMap: Record<string, string> = {};
    const seenClients = new Set<string>();
    const clientBatch: any[] = [];

    for (const r of records) {
      const normDoc = this.normDoc(r.seller_cpf);
      const normPhone = this.normPhone(r.seller_phone);
      const dedupKey = normDoc || normPhone || (r.seller_name ? r.seller_name.toLowerCase().trim() : null);
      if (!dedupKey || seenClients.has(dedupKey)) continue;
      seenClients.add(dedupKey);

      // Check existing
      let existingId: string | null = null;
      if (normDoc) {
        const { data } = await this.supabase.admin.from('clients').select('id').eq('document_number', normDoc).maybeSingle();
        if (data) { existingId = data.id; counters.duplicateCount++; }
      }
      if (!existingId && normPhone) {
        const { data } = await this.supabase.admin.from('clients').select('id').eq('phone', normPhone).maybeSingle();
        if (data) { existingId = data.id; counters.duplicateCount++; }
      }

      if (existingId) {
        clientMap[dedupKey] = existingId;
        // UPDATE existing client with new data
        await this.supabase.admin.from('clients').update({
          email: r.email ? r.email.toLowerCase() : undefined,
          phone_secondary: this.normPhone(r.seller_phone2) || undefined,
          address_street: r.endereco || undefined,
          address_city: r.cidade || undefined,
          address_state: r.estado?.length === 2 ? r.estado : undefined,
          address_zip: r.cep || undefined,
          address_neighborhood: r.bairro || undefined,
        }).eq('id', existingId);
        counters.replacedCount++;
      } else {
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
          address_state: r.estado?.length === 2 ? r.estado : null,
          address_zip: r.cep || null,
          client_type: 'seller',
          status: 'active',
          import_batch_id: batchId,
          notes: `Importado de ${source} XLSX` + (r.profissao ? ` | Profissão: ${r.profissao}` : '') + (r.renda ? ` | Renda: ${r.renda}` : ''),
        });
      }
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
        phone: null, client_type: 'buyer', status: 'active',
        import_batch_id: batchId,
        notes: `Importado de ${source} XLSX (comprador)`,
      });
    }

    // Batch insert clients
    for (let i = 0; i < clientBatch.length; i += 50) {
      const chunk = clientBatch.slice(i, i + 50);
      const rows = chunk.map(({ _key, ...rest }) => rest);
      try {
        const { data } = await this.supabase.admin.from('clients').insert(rows).select('id');
        if (data) {
          for (let j = 0; j < data.length; j++) {
            clientMap[chunk[j]._key] = data[j].id;
            counters.clientsCreated++;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Client batch ${i}: ${err.message}, trying one by one`);
        for (const c of chunk) {
          try {
            const { _key, ...rest } = c;
            const { data } = await this.supabase.admin.from('clients').insert(rest).select('id').single();
            if (data) { clientMap[_key] = data.id; counters.clientsCreated++; }
          } catch (e2: any) {
            counters.invalidRows++;
            counters.errors.push(`Client ${c.full_name}: ${e2.message}`);
          }
        }
      }
      // Update partial progress
      await this.updateBatchStatus(batchId, 'processing', counters);
    }

    // ── FASE 4: Criar units (sempre novos por batch, sem sobrescrever) ��─
    const unitMap: Record<string, string> = {};
    const seenUnits = new Set<string>();
    const unitBatch: any[] = [];

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
        floor, unit_type: (r.tipologia || '').toLowerCase().includes('garden') ? 'house' : 'apartment',
        area_m2: area,
        original_value: r.valor_venda_inicial,
        current_value: r.valor_venda_final || r.valor_venda_inicial,
        status: unitStatus,
        original_client_id: sellerId,
        current_client_id: buyerId || sellerId,
        debts_cadin: ((r.cadin_imovel || 0) + (r.cadin_outros || 0)) || null,
        debts_iptu: (r.iptu || 0) + (r.iptu_2026 || 0) || null,
        debts_condominio: r.condominio,
        import_batch_id: batchId,
        notes: `${source} | ${r.bl_und} | ${r.tipologia || ''} | ${r.interesse || ''} | ${r.angariador || ''}`,
      });
    }

    // Batch insert new units
    for (let i = 0; i < unitBatch.length; i += 50) {
      const chunk = unitBatch.slice(i, i + 50);
      const rows = chunk.map(({ _key, ...rest }) => rest);
      try {
        const { data } = await this.supabase.admin.from('units').insert(rows).select('id');
        if (data) {
          for (let j = 0; j < data.length; j++) {
            unitMap[chunk[j]._key] = data[j].id;
            counters.unitsCreated++;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Unit batch ${i}: ${err.message}`);
        for (const u of chunk) {
          try {
            const { _key, ...rest } = u;
            const { data } = await this.supabase.admin.from('units').insert(rest).select('id').single();
            if (data) { unitMap[_key] = data.id; counters.unitsCreated++; }
          } catch (e2: any) {
            counters.invalidRows++;
            counters.errors.push(`Unit ${u._key}: ${e2.message}`);
          }
        }
      }
    }

    // ── FASE 5: Criar processos + financeiro (com retry) ──
    const { data: flowTypes } = await this.supabase.admin.from('resale_flow_types').select('id,code');
    const standardFlow = flowTypes?.find(f => f.code === 'standard');
    const jerseyFlow = flowTypes?.find(f => f.code === 'jersey_city');

    let standardFirstStage: string | null = null;
    let jerseyFirstStage: string | null = null;
    if (standardFlow) {
      const { data } = await this.supabase.admin.from('flow_stages').select('id').eq('flow_type_id', standardFlow.id).order('stage_order').limit(1);
      standardFirstStage = data?.[0]?.id ?? null;
    }
    if (jerseyFlow) {
      const { data } = await this.supabase.admin.from('flow_stages').select('id').eq('flow_type_id', jerseyFlow.id).order('stage_order').limit(1);
      jerseyFirstStage = data?.[0]?.id ?? null;
    }

    const { data: components } = await this.supabase.admin.from('resale_financial_components').select('id,code');
    const compMap: Record<string, string> = {};
    for (const c of (components || [])) compMap[c.code] = c.id;

    // Build process + financial batches
    const processBatch: any[] = [];

    for (const r of records) {
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
      if (!flowId || !firstStage) { counters.invalidRows++; continue; }

      const processStatus = (r.interesse || '').toLowerCase().includes('vendida') ? 'completed' : 'active';

      processBatch.push({
        _record: r,
        row: {
          flow_type_id: flowId,
          unit_id: unitId,
          seller_client_id: sellerId,
          buyer_client_id: buyerId,
          current_stage_id: firstStage,
          status: processStatus,
          priority: 'normal',
          import_batch_id: batchId,
          notes: [`Fonte: ${source}`, `Unidade: ${r.bl_und}`,
            r.interesse ? `Interesse: ${r.interesse}` : null,
            r.status_raw ? `Status: ${r.status_raw}` : null,
            r.angariador ? `Angariador: ${r.angariador}` : null,
          ].filter(Boolean).join(' | '),
        },
        financialEntries: this.buildFinancialEntries(r, source, compMap, batchId),
      });
    }

    // Insert processes in batches of 50
    for (let i = 0; i < processBatch.length; i += 50) {
      const chunk = processBatch.slice(i, i + 50);

      // Insert new processes (always new — each batch creates its own)
      try {
        const { data, error } = await this.supabase.admin
          .from('resale_processes').insert(chunk.map(p => p.row)).select('id');
        if (error) throw error;
        if (data) {
          for (let j = 0; j < data.length; j++) {
            chunk[j]._processId = data[j].id;
            counters.processesCreated++;
          }
        }
      } catch (err: any) {
        this.logger.error(`Process batch ${i}: ${err.message}`);
        for (const p of chunk) {
          try {
            const { data } = await this.supabase.admin.from('resale_processes').insert(p.row).select('id').single();
            if (data) { p._processId = data.id; counters.processesCreated++; }
          } catch (e2: any) {
            counters.invalidRows++;
            counters.errors.push(`Process ${p._record.bl_und}: ${e2.message}`);
          }
        }
      }

      // Insert financial entries with retry
      for (const p of chunk) {
        if (!p._processId || p.financialEntries.length === 0) continue;

        const entries = p.financialEntries.map((e: any) => ({ ...e, process_id: p._processId }));

        let success = false;
        let lastError = '';
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { data, error } = await this.supabase.admin
              .from('process_financial_entries').insert(entries).select('id');
            if (!error) {
              counters.financialCreated += data?.length ?? 0;
              success = true;
              break;
            }
            lastError = error.message || JSON.stringify(error);
            this.logger.warn(`Financial attempt ${attempt + 1} for ${p._record.bl_und}: ${lastError}`);
          } catch (err: any) {
            lastError = err.message;
            this.logger.warn(`Financial attempt ${attempt + 1} for ${p._record.bl_und}: ${lastError}`);
          }
          if (attempt < 2) await this.sleep(500 * (attempt + 1));
        }

        if (!success) {
          counters.errors.push(`Financial for ${p._record.bl_und}: ${lastError}`);
        }
      }

      counters.validRows = counters.processesCreated;
      await this.updateBatchStatus(batchId, 'processing', counters);
    }

    // Update enterprise counts
    for (const [, eId] of Object.entries(enterpriseMap)) {
      const { count } = await this.supabase.admin
        .from('units').select('id', { count: 'exact', head: true }).eq('enterprise_id', eId);
      await this.supabase.admin.from('enterprises').update({ total_units: count ?? 0 }).eq('id', eId);
    }

    counters.validRows = counters.processesCreated;

    // ── FASE 6: Parsear snapshots por data de qualquer aba ──
    await this.parseSnapshotSheets(wb, source, batchId, counters);
  }

  // ── Parse snapshot sheets: generic detection of horizontal date blocks ──

  private async parseSnapshotSheets(wb: XLSX.WorkBook, source: string, batchId: string, counters: BatchCounters) {
    // Candidate sheet names for snapshot data (try all, skip data sheets)
    const skipSheets = new Set(['antiga', 'usar essa', 'aba_geral', 'planilha2', 'planilha3', 'planilha4', 'repasse', 'repasse cv', 'retorno 1 cobrança', 'ultima dai', 'composição de valores']);
    const candidates = wb.SheetNames.filter(n => !skipSheets.has(n.toLowerCase().trim()));

    if (candidates.length === 0) {
      this.logger.log('No snapshot candidate sheets found');
      return;
    }

    const year = new Date().getFullYear();
    // Regex: matches "Group DD-MM", "Group DD/MM", "Group DD/MM (weekday)", or just "DD/MM (weekday)"
    const datePattern = /^(.*?)\s*(\d{2})[\/\-](\d{2})(?:\s*\(.*\))?$/;

    let totalBlocks = 0;

    for (const sheetName of candidates) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;

      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (data.length < 4) continue;

      // Scan first 5 rows for block headers with date patterns
      let headerRowIdx = -1;
      let blockHeaders: Array<{ col: number; raw: string; group: string; date: string }> = [];

      for (let row = 0; row < Math.min(5, data.length); row++) {
        const found: typeof blockHeaders = [];
        for (let c = 0; c < (data[row]?.length ?? 0); c++) {
          const val = String(data[row][c] || '').trim();
          if (!val || val.length < 4) continue;

          const match = val.match(datePattern);
          if (!match) continue;

          const groupRaw = match[1].trim();
          const day = match[2];
          const month = match[3];
          const dateStr = `${year}-${month}-${day}`;

          // If no group name before date, use source name (from filename detection)
          const groupName = groupRaw || source;
          const normalized = normalizeGroupName(groupName);

          found.push({ col: c, raw: val, group: normalized, date: dateStr });
        }
        if (found.length >= 2) { // At least 2 date blocks = valid snapshot sheet
          headerRowIdx = row;
          blockHeaders = found;
          break;
        }
      }

      if (headerRowIdx < 0 || blockHeaders.length === 0) continue;

      // Propagate first named group to unnamed blocks
      const firstNamedGroup = blockHeaders.find(b => b.group !== normalizeGroupName(source))?.group
        || blockHeaders[0]?.group;
      if (firstNamedGroup) {
        for (const bh of blockHeaders) {
          if (bh.group === normalizeGroupName(source) && firstNamedGroup !== normalizeGroupName(source)) {
            bh.group = firstNamedGroup;
          }
        }
      }

      this.logger.log(`Sheet "${sheetName}": ${blockHeaders.length} snapshot blocks found at row ${headerRowIdx}`);

      // Find sub-header row (Status / Quantidade|Resumo / Ligação) - scan rows after header
      let subHeaderRowIdx = -1;
      for (let row = headerRowIdx + 1; row < Math.min(headerRowIdx + 5, data.length); row++) {
        let hasStatus = false;
        for (let c = 0; c < (data[row]?.length ?? 0); c++) {
          const h = String(data[row][c] || '').trim().toLowerCase();
          if (h === 'status') { hasStatus = true; break; }
        }
        if (hasStatus) { subHeaderRowIdx = row; break; }
      }

      if (subHeaderRowIdx < 0) {
        this.logger.warn(`  No sub-header row found in "${sheetName}"`);
        continue;
      }

      const dataStartRow = subHeaderRowIdx + 1;
      const subRow = data[subHeaderRowIdx] || [];

      // Build blocks with column mappings
      for (const bh of blockHeaders) {
        let statusCol = -1, qtyCol = -1, callCol = -1;

        // Search sub-header columns near the block header column
        for (let sc = bh.col; sc < Math.min(bh.col + 6, subRow.length); sc++) {
          const h = String(subRow[sc] || '').trim().toLowerCase();
          if ((h === 'status') && statusCol === -1) statusCol = sc;
          else if ((h.includes('quantidade') || h.includes('resumo')) && !h.includes('liga') && qtyCol === -1) qtyCol = sc;
          else if (h.includes('liga') && callCol === -1) callCol = sc;
        }

        if (statusCol < 0 || qtyCol < 0) {
          this.logger.warn(`  Block "${bh.raw}": missing Status/Qty columns`);
          continue;
        }

        // Check if snapshot already exists
        const { data: existing } = await this.supabase.admin
          .from('carteira_snapshots')
          .select('id')
          .eq('carteira_nome', bh.group)
          .eq('data_referencia', bh.date)
          .maybeSingle();

        if (existing) continue;

        // Extract items
        const items: Array<{ status: string; qty: number; calls: number }> = [];
        for (let r = dataStartRow; r < data.length; r++) {
          const status = String(data[r][statusCol] || '').trim();
          if (!status) break;

          const qty = Number(data[r][qtyCol]) || 0;
          const calls = callCol >= 0 ? (Number(data[r][callCol]) || 0) : 0;

          items.push({ status, qty, calls });
          if (status.toLowerCase().includes('total geral')) break;
        }

        if (items.length === 0) continue;

        // Insert snapshot
        const { data: snap } = await this.supabase.admin
          .from('carteira_snapshots')
          .insert({
            carteira_nome: bh.group,
            data_referencia: bh.date,
            origem: 'importado',
            importacao_id: batchId,
            arquivo_origem: sheetName,
          })
          .select('id')
          .single();

        if (!snap) continue;

        const rows = items.map((it, idx) => ({
          snapshot_id: snap.id,
          status_nome: it.status,
          quantidade_importada: it.qty,
          qtde_ligacao_importada: it.calls,
          ordem: idx,
        }));

        await this.supabase.admin.from('carteira_snapshot_itens').insert(rows);
        this.logger.log(`  ${bh.group} ${bh.date}: ${items.length} status (from "${sheetName}")`);
        totalBlocks++;
      }
    }

    this.logger.log(`Snapshot parsing complete: ${totalBlocks} blocks saved`);
  }

  // normalizeGroupName is now imported from @/common/utils/text-matching

  // ── Build financial entries for a record ──

  private buildFinancialEntries(r: any, source: string, compMap: Record<string, string>, batchId?: string): any[] {
    const entries: any[] = [];
    const mapped = [
      { code: 'valor_venda', amount: r.valor_venda_final || r.valor_venda_inicial, type: 'receivable' },
      { code: 'financiamento', amount: r.financiamento, type: 'receivable' },
      { code: 'subsidio', amount: r.subsidio, type: 'receivable' },
      { code: 'fgts', amount: r.fgts, type: 'receivable' },
      { code: 'endividamento', amount: r.quanto_deve_lyx, type: 'payable' },
      { code: 'jdo', amount: r.saldo_jdo, type: 'payable' },
      { code: 'documentacao', amount: r.vlr_doc, type: 'payable' },
      { code: 'laudo', amount: r.laudo_valor, type: 'payable' },
      { code: 'iptu', amount: (r.iptu || 0) + (r.iptu_2026 || 0) || null, type: 'payable' },
      { code: 'comissao', amount: r.comissao, type: 'payable' },
    ];

    for (const e of mapped) {
      if (e.amount && compMap[e.code]) {
        entries.push({
          component_id: compMap[e.code],
          entry_type: e.type,
          amount: e.amount,
          payment_status: 'pending',
          import_batch_id: batchId || null,
          notes: `Importado de ${source} XLSX`,
        });
      }
    }

    // Extras
    const extras = [
      r.divida_inicial ? { amount: r.divida_inicial, type: 'payable', desc: 'Dívida inicial', status: 'pending' } : null,
      r.sinal ? { amount: r.sinal, type: 'received', desc: 'Sinal pago', status: 'paid' } : null,
      r.quanto_pagou ? { amount: r.quanto_pagou, type: 'received', desc: 'Quanto já pagou', status: 'paid' } : null,
      r.condominio ? { amount: r.condominio, type: 'payable', desc: 'Condomínio', status: 'pending' } : null,
    ].filter(Boolean);

    for (const e of extras) {
      if (!e) continue;
      entries.push({
        component_id: compMap['valor_venda'] || Object.values(compMap)[0],
        entry_type: e.type,
        amount: e.amount,
        description: e.desc,
        payment_status: e.status,
        import_batch_id: batchId || null,
        notes: `Importado de ${source} XLSX`,
      });
    }

    return entries;
  }

  // ── Snapshot processing (kept from original) ──

  private async processSnapshot(batchId: string, content: string, filename: string, counters: BatchCounters) {
    // Delegate to the same logic that was in imports.service.ts
    // This is a simplified version for snapshot pivot CSVs
    counters.totalRows = 0;
    counters.validRows = 0;
    // TODO: move existing snapshot logic here if needed
  }

  private getContentFromBuffer(buffer: Buffer, filename: string): string {
    if (/\.xlsx?$/i.test(filename)) {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const pivotSheet = wb.SheetNames.find(n => /planilha7|evolu/i.test(n)) || wb.SheetNames[0];
      return XLSX.utils.sheet_to_csv(wb.Sheets[pivotSheet]);
    }
    return buffer.toString('utf-8');
  }

  // ── Helpers ──

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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

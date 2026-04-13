import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import {
  CreateSnapshotDto,
  CreateItemDto,
  UpdateItemDto,
  CreateAjusteDto,
  DuplicarSnapshotDto,
} from './carteiras.dto';

@Injectable()
export class CarteirasService {
  private readonly logger = new Logger(CarteirasService.name);

  constructor(private supabase: SupabaseService) {}

  // ── Listar carteiras distintas ──

  async listCarteiras() {
    const { data, error } = await this.supabase.admin
      .from('carteira_snapshots')
      .select('carteira_nome')
      .order('carteira_nome');

    if (error) throw error;
    const unique = [...new Set((data ?? []).map((d) => d.carteira_nome))];
    return unique;
  }

  // ── Listar datas de uma carteira ──

  async listDatas(carteira: string) {
    const { data, error } = await this.supabase.admin
      .from('carteira_snapshots')
      .select('id, data_referencia, origem, criado_em, atualizado_em')
      .eq('carteira_nome', carteira)
      .order('data_referencia', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  // ── Obter snapshot consolidado ──

  async getConsolidado(carteira: string, data: string) {
    // 1. Buscar snapshot
    const { data: snap, error } = await this.supabase.admin
      .from('carteira_snapshots')
      .select('*')
      .eq('carteira_nome', carteira)
      .eq('data_referencia', data)
      .maybeSingle();

    if (error) throw error;
    if (!snap) throw new NotFoundException(`Snapshot não encontrado: ${carteira} / ${data}`);

    // 2. Buscar itens
    const { data: itens } = await this.supabase.admin
      .from('carteira_snapshot_itens')
      .select('*')
      .eq('snapshot_id', snap.id)
      .order('ordem', { ascending: true, nullsFirst: false });

    // 3. Buscar ajustes ativos (mais recente por item)
    const itemIds = (itens ?? []).map((i) => i.id);
    let ajusteMap: Record<string, any> = {};
    if (itemIds.length > 0) {
      const { data: ajustes } = await this.supabase.admin
        .from('carteira_snapshot_ajustes')
        .select('*')
        .in('snapshot_item_id', itemIds)
        .eq('ativo', true)
        .order('editado_em', { ascending: false });

      for (const a of ajustes ?? []) {
        if (!ajusteMap[a.snapshot_item_id]) {
          ajusteMap[a.snapshot_item_id] = a;
        }
      }
    }

    // 4. Consolidar
    let totalGeral = 0;
    let totalLigacoes = 0;
    let temAjusteManual = false;

    const itensConsolidados = (itens ?? [])
      .filter((i) => i.ativo)
      .map((i) => {
        const ajuste = ajusteMap[i.id];
        const qtdFinal = ajuste?.quantidade_manual ?? i.quantidade_importada ?? 0;
        const ligFinal = ajuste?.qtde_ligacao_manual ?? i.qtde_ligacao_importada ?? 0;
        const temAjuste = !!ajuste;

        if (temAjuste) temAjusteManual = true;

        // Não contar "Total Geral" no cálculo
        const isTotal = (i.status_nome || '').toLowerCase().includes('total geral');
        if (!isTotal) {
          totalGeral += Number(qtdFinal) || 0;
          totalLigacoes += Number(ligFinal) || 0;
        }

        return {
          id: i.id,
          status_nome: i.status_nome,
          quantidade_importada: i.quantidade_importada,
          qtde_ligacao_importada: i.qtde_ligacao_importada,
          quantidade_final: qtdFinal,
          qtde_ligacao_final: ligFinal,
          tem_ajuste_manual: temAjuste,
          origem_valor: temAjuste ? 'manual' : i.quantidade_importada !== null ? 'importado' : 'manual',
          ordem: i.ordem,
          ajuste_motivo: ajuste?.motivo ?? null,
          ajuste_em: ajuste?.editado_em ?? null,
        };
      });

    // Determinar origem do snapshot
    const origemReal = temAjusteManual
      ? (snap.origem === 'importado' ? 'misto' : snap.origem)
      : snap.origem;

    return {
      snapshot: {
        id: snap.id,
        carteira_nome: snap.carteira_nome,
        data_referencia: snap.data_referencia,
        origem: origemReal,
        observacao: snap.observacao,
        criado_em: snap.criado_em,
        atualizado_em: snap.atualizado_em,
      },
      totais: {
        total_geral_calculado: totalGeral,
        total_ligacoes_calculado: totalLigacoes,
        total_status: itensConsolidados.filter((i) => !(i.status_nome || '').toLowerCase().includes('total geral')).length,
        tem_ajuste_manual: temAjusteManual,
      },
      itens: itensConsolidados,
    };
  }

  // ── Criar snapshot manual vazio ──

  async createSnapshot(carteira: string, data: string, dto: CreateSnapshotDto, userId?: string) {
    const { data: existing } = await this.supabase.admin
      .from('carteira_snapshots')
      .select('id')
      .eq('carteira_nome', carteira)
      .eq('data_referencia', data)
      .maybeSingle();

    if (existing) throw new ConflictException(`Já existe snapshot para ${carteira} em ${data}`);

    const { data: snap, error } = await this.supabase.admin
      .from('carteira_snapshots')
      .insert({
        carteira_nome: carteira,
        data_referencia: data,
        origem: 'manual',
        observacao: dto.observacao,
        criado_por: userId,
        atualizado_por: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    await this.audit(snap.id, null, null, 'IMPORT_CREATED', null, null, `Snapshot manual criado`, userId);

    return { id: snap.id };
  }

  // ── Duplicar dia anterior ──

  async duplicarSnapshot(carteira: string, dataOrigem: string, dataDestino: string, dto: DuplicarSnapshotDto, userId?: string) {
    // Verificar se destino já existe
    const { data: existing } = await this.supabase.admin
      .from('carteira_snapshots')
      .select('id')
      .eq('carteira_nome', carteira)
      .eq('data_referencia', dataDestino)
      .maybeSingle();

    if (existing) throw new ConflictException(`Já existe snapshot para ${carteira} em ${dataDestino}`);

    // Buscar consolidado da origem
    const origem = await this.getConsolidado(carteira, dataOrigem);

    // Criar novo snapshot
    const { data: newSnap, error } = await this.supabase.admin
      .from('carteira_snapshots')
      .insert({
        carteira_nome: carteira,
        data_referencia: dataDestino,
        origem: 'manual',
        observacao: dto.observacao || `Duplicado de ${dataOrigem}`,
        criado_por: userId,
        atualizado_por: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Copiar itens consolidados como importados do novo snapshot
    const itens = origem.itens.map((i, idx) => ({
      snapshot_id: newSnap.id,
      status_nome: i.status_nome,
      quantidade_importada: i.quantidade_final,
      qtde_ligacao_importada: i.qtde_ligacao_final,
      ordem: i.ordem ?? idx,
    }));

    if (itens.length > 0) {
      await this.supabase.admin.from('carteira_snapshot_itens').insert(itens);
    }

    await this.audit(newSnap.id, null, null, 'SNAPSHOT_CLONED', null, dataOrigem, dataDestino, userId);

    return { id: newSnap.id, itens_copiados: itens.length };
  }

  // ── Criar item no snapshot ──

  async createItem(carteira: string, data: string, dto: CreateItemDto, userId?: string) {
    const snap = await this.findSnapshot(carteira, data);

    const { data: item, error } = await this.supabase.admin
      .from('carteira_snapshot_itens')
      .insert({
        snapshot_id: snap.id,
        status_nome: dto.status_nome,
        quantidade_importada: dto.quantidade,
        qtde_ligacao_importada: dto.qtde_ligacao,
        ordem: dto.ordem,
      })
      .select('id')
      .single();

    if (error) throw error;

    await this.updateSnapshotTimestamp(snap.id, userId);
    await this.audit(snap.id, item.id, null, 'ITEM_CREATED', null, null, dto.status_nome, userId);

    return { id: item.id };
  }

  // ── Atualizar item (dados importados) ──

  async updateItem(carteira: string, data: string, itemId: string, dto: UpdateItemDto, userId?: string) {
    const snap = await this.findSnapshot(carteira, data);

    const { data: before } = await this.supabase.admin
      .from('carteira_snapshot_itens')
      .select('*')
      .eq('id', itemId)
      .eq('snapshot_id', snap.id)
      .single();

    if (!before) throw new NotFoundException('Item não encontrado');

    const payload: any = {};
    if (dto.quantidade_importada !== undefined) payload.quantidade_importada = dto.quantidade_importada;
    if (dto.qtde_ligacao_importada !== undefined) payload.qtde_ligacao_importada = dto.qtde_ligacao_importada;
    if (dto.ordem !== undefined) payload.ordem = dto.ordem;
    if (dto.ativo !== undefined) payload.ativo = dto.ativo;
    payload.atualizado_em = new Date().toISOString();

    await this.supabase.admin.from('carteira_snapshot_itens').update(payload).eq('id', itemId);
    await this.updateSnapshotTimestamp(snap.id, userId);

    if (dto.ativo === false) {
      await this.audit(snap.id, itemId, null, 'ITEM_DELETED', 'ativo', 'true', 'false', userId);
    } else {
      await this.audit(snap.id, itemId, null, 'ITEM_UPDATED', null, JSON.stringify(before), JSON.stringify(payload), userId);
    }

    return { success: true };
  }

  // ── Criar ajuste manual ──

  async createAjuste(carteira: string, data: string, itemId: string, dto: CreateAjusteDto, userId?: string) {
    const snap = await this.findSnapshot(carteira, data);

    // Verificar se item pertence ao snapshot
    const { data: item } = await this.supabase.admin
      .from('carteira_snapshot_itens')
      .select('id, quantidade_importada, qtde_ligacao_importada')
      .eq('id', itemId)
      .eq('snapshot_id', snap.id)
      .single();

    if (!item) throw new NotFoundException('Item não encontrado neste snapshot');

    // Desativar ajustes anteriores
    await this.supabase.admin
      .from('carteira_snapshot_ajustes')
      .update({ ativo: false })
      .eq('snapshot_item_id', itemId)
      .eq('ativo', true);

    // Criar novo ajuste
    const { data: ajuste, error } = await this.supabase.admin
      .from('carteira_snapshot_ajustes')
      .insert({
        snapshot_item_id: itemId,
        quantidade_manual: dto.quantidade_manual,
        qtde_ligacao_manual: dto.qtde_ligacao_manual,
        motivo: dto.motivo,
        editado_por: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Atualizar origem do snapshot para 'misto' se era 'importado'
    await this.supabase.admin
      .from('carteira_snapshots')
      .update({ origem: 'misto', atualizado_em: new Date().toISOString(), atualizado_por: userId })
      .eq('id', snap.id)
      .eq('origem', 'importado');

    await this.updateSnapshotTimestamp(snap.id, userId);
    await this.audit(snap.id, itemId, ajuste.id, 'MANUAL_OVERRIDE_CREATED', 'quantidade',
      String(item.quantidade_importada ?? ''),
      String(dto.quantidade_manual ?? ''), userId);

    return { id: ajuste.id };
  }

  // ── Remover ajuste manual (voltar ao importado) ──

  async removeAjuste(carteira: string, data: string, itemId: string, userId?: string) {
    const snap = await this.findSnapshot(carteira, data);

    const { data: ajustes } = await this.supabase.admin
      .from('carteira_snapshot_ajustes')
      .select('id')
      .eq('snapshot_item_id', itemId)
      .eq('ativo', true);

    if (!ajustes?.length) return { success: true, message: 'Nenhum ajuste ativo' };

    await this.supabase.admin
      .from('carteira_snapshot_ajustes')
      .update({ ativo: false })
      .eq('snapshot_item_id', itemId)
      .eq('ativo', true);

    await this.updateSnapshotTimestamp(snap.id, userId);
    await this.audit(snap.id, itemId, null, 'MANUAL_OVERRIDE_REMOVED', null, null, null, userId);

    return { success: true };
  }

  // ── Auditoria ──

  async getAuditoria(carteira: string, data: string) {
    const snap = await this.findSnapshot(carteira, data);

    const { data: logs, error } = await this.supabase.admin
      .from('carteira_snapshot_audit')
      .select('*')
      .eq('snapshot_id', snap.id)
      .order('criado_em', { ascending: false })
      .limit(100);

    if (error) throw error;
    return logs ?? [];
  }

  // ── Sincronizar com dados importados ──

  async syncFromImportedSnapshots(carteira: string) {
    let synced = 0;

    // Estratégia 1: daily_status_snapshots (CSV pivot imports)
    const { data: snapshots } = await this.supabase.admin
      .from('daily_status_snapshots')
      .select('batch_id, operation_name, snapshot_date, status_name_raw, quantity, call_quantity')
      .eq('operation_name', carteira);

    if (snapshots?.length) {
      const byDate: Record<string, Array<{ status: string; qty: number; calls: number }>> = {};
      for (const s of snapshots) {
        if (!byDate[s.snapshot_date]) byDate[s.snapshot_date] = [];
        byDate[s.snapshot_date].push({ status: s.status_name_raw, qty: Number(s.quantity) || 0, calls: Number(s.call_quantity) || 0 });
      }
      for (const [dateStr, items] of Object.entries(byDate)) {
        if (await this.createSnapshotFromItems(carteira, dateStr, items)) synced++;
      }
    }

    // Estratégia 2: resale_processes (XLSX detailed imports)
    const { data: batches } = await this.supabase.admin
      .from('import_batches')
      .select('id, source_name, created_at')
      .eq('source_name', carteira)
      .eq('status', 'done')
      .not('import_type', 'eq', 'snapshot');

    if (batches?.length) {
      for (const batch of batches) {
        const dateStr = batch.created_at?.split('T')[0];
        if (!dateStr) continue;

        const { data: processes } = await this.supabase.admin
          .from('resale_processes')
          .select(`
            id, status, notes,
            current_stage:flow_stages!resale_processes_current_stage_id_fkey(name, stage_group, stage_order)
          `)
          .eq('import_batch_id', batch.id);

        if (!processes?.length) continue;

        // Agrupar por stage name — extrair status original das notes se possível
        const stageMap: Record<string, { qty: number; order: number }> = {};
        for (const p of processes) {
          const stage = p.current_stage as any;
          const name = stage?.name ?? p.status ?? 'Desconhecido';
          const order = stage?.stage_order ?? 99;
          if (!stageMap[name]) stageMap[name] = { qty: 0, order };
          stageMap[name].qty++;
        }

        const items = Object.entries(stageMap)
          .sort((a, b) => a[1].order - b[1].order)
          .map(([status, v]) => ({ status, qty: v.qty, calls: 0 }));

        if (await this.createSnapshotFromItems(carteira, dateStr, items)) synced++;
      }
    }

    return { synced };
  }

  private async createSnapshotFromItems(
    carteira: string, dateStr: string,
    items: Array<{ status: string; qty: number; calls: number }>,
  ): Promise<boolean> {
    const { data: existing } = await this.supabase.admin
      .from('carteira_snapshots')
      .select('id')
      .eq('carteira_nome', carteira)
      .eq('data_referencia', dateStr)
      .maybeSingle();

    if (existing) return false;

    const { data: snap } = await this.supabase.admin
      .from('carteira_snapshots')
      .insert({ carteira_nome: carteira, data_referencia: dateStr, origem: 'importado' })
      .select('id')
      .single();

    if (!snap) return false;

    const rows = items.map((it, idx) => ({
      snapshot_id: snap.id,
      status_nome: it.status,
      quantidade_importada: it.qty,
      qtde_ligacao_importada: it.calls,
      ordem: idx,
    }));

    if (rows.length > 0) {
      await this.supabase.admin.from('carteira_snapshot_itens').insert(rows);
    }

    await this.audit(snap.id, null, null, 'IMPORT_CREATED', null, null, `Sync: ${items.length} status`);
    return true;
  }

  // ── Helpers ──

  private async findSnapshot(carteira: string, data: string) {
    const { data: snap, error } = await this.supabase.admin
      .from('carteira_snapshots')
      .select('id')
      .eq('carteira_nome', carteira)
      .eq('data_referencia', data)
      .single();

    if (error || !snap) throw new NotFoundException(`Snapshot não encontrado: ${carteira} / ${data}`);
    return snap;
  }

  private async updateSnapshotTimestamp(snapId: string, userId?: string) {
    await this.supabase.admin.from('carteira_snapshots').update({
      atualizado_em: new Date().toISOString(),
      atualizado_por: userId,
    }).eq('id', snapId);
  }

  private async audit(
    snapId: string | null, itemId: string | null, ajusteId: string | null,
    acao: string, campo: string | null, valorAnterior: string | null, valorNovo: string | null,
    userId?: string,
  ) {
    try {
      await this.supabase.admin.from('carteira_snapshot_audit').insert({
        snapshot_id: snapId,
        snapshot_item_id: itemId,
        ajuste_id: ajusteId,
        acao,
        campo,
        valor_anterior: valorAnterior,
        valor_novo: valorNovo,
        usuario_id: userId,
      });
    } catch (err: any) {
      this.logger.warn(`Audit log failed: ${err.message}`);
    }
  }
}

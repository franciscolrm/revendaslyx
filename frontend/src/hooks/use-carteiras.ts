import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface CarteiraItem {
  id: string;
  status_nome: string;
  quantidade_importada: number | null;
  qtde_ligacao_importada: number | null;
  quantidade_final: number;
  qtde_ligacao_final: number;
  tem_ajuste_manual: boolean;
  origem_valor: 'importado' | 'manual';
  ordem: number | null;
  ajuste_motivo: string | null;
  ajuste_em: string | null;
}

export interface CarteiraConsolidado {
  snapshot: {
    id: string;
    carteira_nome: string;
    data_referencia: string;
    origem: string;
    observacao: string | null;
    criado_em: string;
    atualizado_em: string;
  };
  totais: {
    total_geral_calculado: number;
    total_ligacoes_calculado: number;
    total_status: number;
    tem_ajuste_manual: boolean;
  };
  itens: CarteiraItem[];
}

export interface CarteiraData {
  id: string;
  data_referencia: string;
  origem: string;
  criado_em: string;
  atualizado_em: string;
}

export function useCarteiras() {
  return useQuery<string[]>({
    queryKey: ['carteiras'],
    queryFn: () => api.get('/carteiras').then((r) => r.data),
  });
}

export function useCarteiraDatas(carteira?: string) {
  return useQuery<CarteiraData[]>({
    queryKey: ['carteiras', carteira, 'datas'],
    queryFn: () => api.get(`/carteiras/${carteira}/datas`).then((r) => r.data),
    enabled: !!carteira,
  });
}

export function useCarteiraConsolidado(carteira?: string, data?: string) {
  return useQuery<CarteiraConsolidado>({
    queryKey: ['carteiras', carteira, data],
    queryFn: () => api.get(`/carteiras/${carteira}/${data}`).then((r) => r.data),
    enabled: !!carteira && !!data,
  });
}

export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ carteira, data, observacao }: { carteira: string; data: string; observacao?: string }) =>
      api.post(`/carteiras/${carteira}/${data}`, { observacao }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carteiras'] }),
  });
}

export function useDuplicarSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ carteira, dataOrigem, dataDestino, observacao }: { carteira: string; dataOrigem: string; dataDestino: string; observacao?: string }) =>
      api.post(`/carteiras/${carteira}/${dataOrigem}/duplicar?data_destino=${dataDestino}`, { observacao }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carteiras'] }),
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ carteira, data, ...dto }: { carteira: string; data: string; status_nome: string; quantidade?: number; qtde_ligacao?: number; ordem?: number }) =>
      api.post(`/carteiras/${carteira}/${data}/itens`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carteiras'] }),
  });
}

export function useCreateAjuste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ carteira, data, itemId, ...dto }: { carteira: string; data: string; itemId: string; quantidade_manual?: number; qtde_ligacao_manual?: number; motivo?: string }) =>
      api.post(`/carteiras/${carteira}/${data}/itens/${itemId}/ajuste`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carteiras'] }),
  });
}

export function useRemoveAjuste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ carteira, data, itemId }: { carteira: string; data: string; itemId: string }) =>
      api.delete(`/carteiras/${carteira}/${data}/itens/${itemId}/ajuste`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carteiras'] }),
  });
}

export function useSyncCarteira() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (carteira: string) => api.post(`/carteiras/${carteira}/sync`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carteiras'] }),
  });
}

export function useCarteiraAudit(carteira?: string, data?: string) {
  return useQuery({
    queryKey: ['carteiras', carteira, data, 'audit'],
    queryFn: () => api.get(`/carteiras/${carteira}/${data}/auditoria`).then((r) => r.data),
    enabled: !!carteira && !!data,
  });
}

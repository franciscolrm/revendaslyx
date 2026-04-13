-- ============================================================
-- MIGRATION 00016: Módulo de Carteiras
-- Gerenciamento de snapshots por carteira com edição manual,
-- consolidação e auditoria. Isolado das tabelas existentes.
-- ============================================================

-- 1. CABEÇALHO DO SNAPSHOT POR CARTEIRA/DATA
CREATE TABLE IF NOT EXISTS carteira_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carteira_nome   TEXT NOT NULL,
    data_referencia DATE NOT NULL,
    origem          TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('importado', 'manual', 'misto')),
    importacao_id   UUID NULL,
    arquivo_origem  TEXT NULL,
    observacao      TEXT NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    criado_por      UUID NULL REFERENCES users(id),
    atualizado_por  UUID NULL REFERENCES users(id),
    UNIQUE(carteira_nome, data_referencia)
);

CREATE INDEX IF NOT EXISTS idx_cart_snap_carteira ON carteira_snapshots(carteira_nome);
CREATE INDEX IF NOT EXISTS idx_cart_snap_data ON carteira_snapshots(data_referencia);

-- 2. ITENS/STATUS DO SNAPSHOT (dados importados)
CREATE TABLE IF NOT EXISTS carteira_snapshot_itens (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id             UUID NOT NULL REFERENCES carteira_snapshots(id) ON DELETE CASCADE,
    status_nome             TEXT NOT NULL,
    quantidade_importada    NUMERIC NULL,
    qtde_ligacao_importada  NUMERIC NULL,
    ordem                   INTEGER NULL,
    ativo                   BOOLEAN NOT NULL DEFAULT true,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(snapshot_id, status_nome)
);

CREATE INDEX IF NOT EXISTS idx_cart_item_snap ON carteira_snapshot_itens(snapshot_id);

-- 3. AJUSTES MANUAIS POR ITEM
CREATE TABLE IF NOT EXISTS carteira_snapshot_ajustes (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_item_id        UUID NOT NULL REFERENCES carteira_snapshot_itens(id) ON DELETE CASCADE,
    quantidade_manual       NUMERIC NULL,
    qtde_ligacao_manual     NUMERIC NULL,
    motivo                  TEXT NULL,
    editado_por             UUID NULL REFERENCES users(id),
    editado_em              TIMESTAMPTZ NOT NULL DEFAULT now(),
    ativo                   BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_cart_ajuste_item ON carteira_snapshot_ajustes(snapshot_item_id);

-- 4. AUDITORIA
CREATE TABLE IF NOT EXISTS carteira_snapshot_audit (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id         UUID NULL REFERENCES carteira_snapshots(id) ON DELETE SET NULL,
    snapshot_item_id    UUID NULL REFERENCES carteira_snapshot_itens(id) ON DELETE SET NULL,
    ajuste_id           UUID NULL REFERENCES carteira_snapshot_ajustes(id) ON DELETE SET NULL,
    acao                TEXT NOT NULL,
    campo               TEXT NULL,
    valor_anterior      TEXT NULL,
    valor_novo          TEXT NULL,
    usuario_id          UUID NULL REFERENCES users(id),
    usuario_nome        TEXT NULL,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_audit_snap ON carteira_snapshot_audit(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_cart_audit_item ON carteira_snapshot_audit(snapshot_item_id);
CREATE INDEX IF NOT EXISTS idx_cart_audit_data ON carteira_snapshot_audit(criado_em);

-- ============================================================
-- VIEWS E RELATÓRIOS
-- ============================================================

-- ============================================================
-- 1. PIPELINE — Contagem de revendas por status/stage
-- ============================================================

CREATE OR REPLACE VIEW public.vw_pipeline AS
SELECT
    rs.stage_group,
    rs.code         AS status_code,
    rs.name         AS status_name,
    rs.sort_order,
    COUNT(r.id)     AS total_resales
FROM public.resale_statuses rs
LEFT JOIN public.resales r ON r.current_status_id = rs.id
WHERE rs.is_active = true
GROUP BY rs.id, rs.stage_group, rs.code, rs.name, rs.sort_order
ORDER BY rs.sort_order;

-- ============================================================
-- 2. PIPELINE POR FILIAL — Detalhamento regional
-- ============================================================

CREATE OR REPLACE VIEW public.vw_pipeline_by_branch AS
SELECT
    c.name          AS company_name,
    reg.name        AS region_name,
    b.name          AS branch_name,
    rs.stage_group,
    rs.code         AS status_code,
    rs.name         AS status_name,
    rs.sort_order,
    COUNT(r.id)     AS total_resales
FROM public.resales r
JOIN public.resale_statuses rs ON rs.id = r.current_status_id
LEFT JOIN public.branches b   ON b.id = r.branch_id
LEFT JOIN public.regions reg  ON reg.id = r.region_id
LEFT JOIN public.companies c  ON c.id = COALESCE(b.company_id, reg.company_id)
GROUP BY c.name, reg.name, b.name, rs.id, rs.stage_group, rs.code, rs.name, rs.sort_order
ORDER BY c.name, reg.name, b.name, rs.sort_order;

-- ============================================================
-- 3. PERFORMANCE POR EQUIPE
-- ============================================================

CREATE OR REPLACE VIEW public.vw_team_performance AS
SELECT
    t.id            AS team_id,
    t.name          AS team_name,
    b.name          AS branch_name,
    reg.name        AS region_name,
    leader.full_name AS leader_name,
    COUNT(DISTINCT r.id)                                             AS total_resales,
    COUNT(DISTINCT r.id) FILTER (WHERE rs.stage_group = 'finalizado')  AS concluidas,
    COUNT(DISTINCT r.id) FILTER (WHERE rs.code = '08_distrato')      AS distratos,
    COUNT(DISTINCT ri.id)                                            AS total_interactions,
    COUNT(DISTINCT ri.id) FILTER (
        WHERE ri.interaction_date >= date_trunc('month', CURRENT_DATE)
    ) AS interactions_mes_atual
FROM public.teams t
LEFT JOIN public.branches b    ON b.id = t.branch_id
LEFT JOIN public.regions reg   ON reg.id = b.region_id
LEFT JOIN public.users leader  ON leader.id = t.leader_user_id
LEFT JOIN public.resales r     ON r.team_id = t.id
LEFT JOIN public.resale_statuses rs ON rs.id = r.current_status_id
LEFT JOIN public.resale_interactions ri ON ri.resale_id = r.id
GROUP BY t.id, t.name, b.name, reg.name, leader.full_name;

-- ============================================================
-- 4. PERFORMANCE POR USUÁRIO (REVENDEDOR)
-- ============================================================

CREATE OR REPLACE VIEW public.vw_user_performance AS
SELECT
    u.id            AS user_id,
    u.full_name,
    t.name          AS team_name,
    b.name          AS branch_name,
    COUNT(DISTINCT r.id)                                               AS total_resales,
    COUNT(DISTINCT r.id) FILTER (WHERE rs.stage_group = 'finalizado')    AS concluidas,
    COUNT(DISTINCT r.id) FILTER (WHERE rs.code = '08_distrato')        AS distratos,
    COUNT(DISTINCT ri.id)                                              AS total_interactions,
    COUNT(DISTINCT ri.id) FILTER (
        WHERE ri.interaction_date >= date_trunc('month', CURRENT_DATE)
    ) AS interactions_mes_atual,
    MAX(ri.interaction_date)                                           AS ultima_interacao
FROM public.users u
LEFT JOIN public.teams t       ON t.id = u.team_id
LEFT JOIN public.branches b    ON b.id = u.branch_id
LEFT JOIN public.resales r     ON r.assigned_user_id = u.id
LEFT JOIN public.resale_statuses rs ON rs.id = r.current_status_id
LEFT JOIN public.resale_interactions ri ON ri.resale_id = r.id AND ri.performed_by = u.id
WHERE u.status = 'active'
GROUP BY u.id, u.full_name, t.name, b.name;

-- ============================================================
-- 5. FINANCEIRO CONSOLIDADO POR REVENDA
-- ============================================================

CREATE OR REPLACE VIEW public.vw_resale_financial_summary AS
SELECT
    r.id             AS resale_id,
    r.external_code,
    r.customer_name,
    rs.name          AS status_name,
    b.name           AS branch_name,
    -- Pivot dos componentes principais
    SUM(fv.amount) FILTER (WHERE fc.code = 'valor_venda')     AS valor_venda,
    SUM(fv.amount) FILTER (WHERE fc.code = 'valor_avaliacao') AS valor_avaliacao,
    SUM(fv.amount) FILTER (WHERE fc.code = 'financiamento')   AS financiamento,
    SUM(fv.amount) FILTER (WHERE fc.code = 'subsidio')        AS subsidio,
    SUM(fv.amount) FILTER (WHERE fc.code = 'fgts')            AS fgts,
    SUM(fv.amount) FILTER (WHERE fc.code = 'comissao')        AS comissao,
    -- Totais por tipo
    SUM(fv.amount) FILTER (WHERE fc.component_type = 'receita')    AS total_receitas,
    SUM(fv.amount) FILTER (WHERE fc.component_type = 'despesa')    AS total_despesas,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'receita'), 0)
    - COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'despesa'), 0)
                                                                   AS resultado_liquido
FROM public.resales r
LEFT JOIN public.resale_statuses rs        ON rs.id = r.current_status_id
LEFT JOIN public.branches b                ON b.id = r.branch_id
LEFT JOIN public.resale_financial_values fv ON fv.resale_id = r.id
LEFT JOIN public.resale_financial_components fc ON fc.id = fv.component_id
GROUP BY r.id, r.external_code, r.customer_name, rs.name, b.name;

-- ============================================================
-- 6. FINANCEIRO AGREGADO POR FILIAL
-- ============================================================

CREATE OR REPLACE VIEW public.vw_financial_by_branch AS
SELECT
    c.name           AS company_name,
    reg.name         AS region_name,
    b.id             AS branch_id,
    b.name           AS branch_name,
    COUNT(DISTINCT r.id)                                              AS total_resales,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.code = 'valor_venda'), 0)   AS total_valor_venda,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.code = 'comissao'), 0)      AS total_comissao,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'receita'), 0)  AS total_receitas,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'despesa'), 0)  AS total_despesas,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'receita'), 0)
    - COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'despesa'), 0)
                                                                          AS resultado_liquido
FROM public.branches b
JOIN public.regions reg    ON reg.id = b.region_id
JOIN public.companies c    ON c.id = b.company_id
LEFT JOIN public.resales r ON r.branch_id = b.id
LEFT JOIN public.resale_financial_values fv    ON fv.resale_id = r.id
LEFT JOIN public.resale_financial_components fc ON fc.id = fv.component_id
GROUP BY c.name, reg.name, b.id, b.name;

-- ============================================================
-- 7. HISTÓRICO DE SNAPSHOTS — Evolução temporal
-- ============================================================

CREATE OR REPLACE VIEW public.vw_snapshot_evolution AS
SELECT
    sb.reference_date,
    sb.source_name,
    ds.operation_name,
    ds.status_name_raw,
    rs.stage_group,
    ds.quantity,
    ds.call_quantity
FROM public.daily_status_snapshots ds
JOIN public.snapshot_batches sb    ON sb.id = ds.batch_id
LEFT JOIN public.resale_statuses rs ON rs.id = ds.status_id
WHERE sb.status = 'done'
ORDER BY sb.reference_date, ds.operation_name, rs.sort_order;

-- ============================================================
-- 8. RESALE COMPLETA — Visão unificada para listagem
-- ============================================================

CREATE OR REPLACE VIEW public.vw_resale_detail AS
SELECT
    r.id,
    r.external_code,
    r.title,
    r.customer_name,
    r.document,
    r.phone,
    r.email,
    r.source,
    r.notes,
    r.created_at,
    r.updated_at,
    -- Status
    rs.code         AS status_code,
    rs.name         AS status_name,
    rs.stage_group,
    -- Organograma
    reg.name        AS region_name,
    b.name          AS branch_name,
    t.name          AS team_name,
    u.full_name     AS assigned_user_name,
    -- Métricas rápidas
    (SELECT COUNT(*) FROM public.resale_interactions ri WHERE ri.resale_id = r.id)
                    AS total_interactions,
    (SELECT MAX(ri.interaction_date) FROM public.resale_interactions ri WHERE ri.resale_id = r.id)
                    AS last_interaction_at,
    (SELECT COUNT(*) FROM public.resale_financial_values fv WHERE fv.resale_id = r.id)
                    AS total_financial_entries
FROM public.resales r
LEFT JOIN public.resale_statuses rs ON rs.id = r.current_status_id
LEFT JOIN public.regions reg        ON reg.id = r.region_id
LEFT JOIN public.branches b         ON b.id = r.branch_id
LEFT JOIN public.teams t            ON t.id = r.team_id
LEFT JOIN public.users u            ON u.id = r.assigned_user_id;

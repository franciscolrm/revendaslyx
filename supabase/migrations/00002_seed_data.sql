-- ============================================================
-- SEED — Dados iniciais
-- ============================================================

-- ----------------------------------------
-- Roles (perfis macro)
-- ----------------------------------------
INSERT INTO roles (name, description) VALUES
    ('super_admin',       'Acesso total ao sistema'),
    ('admin_pyx',         'Administrador PYX'),
    ('diretoria',         'Diretoria executiva'),
    ('gerente_regional',  'Gerente de região'),
    ('supervisor',        'Supervisor de equipe'),
    ('revendedor',        'Revendedor / operador'),
    ('financeiro',        'Equipe financeira'),
    ('backoffice',        'Backoffice operacional'),
    ('auditoria',         'Auditoria e compliance');

-- ----------------------------------------
-- Permissions (granulares)
-- ----------------------------------------
INSERT INTO permissions (module, action, description) VALUES
    -- users
    ('users',      'view',    'Visualizar usuários'),
    ('users',      'create',  'Criar usuários'),
    ('users',      'edit',    'Editar usuários'),
    ('users',      'delete',  'Remover usuários'),
    -- resales
    ('resales',    'view',    'Visualizar revendas'),
    ('resales',    'create',  'Criar revendas'),
    ('resales',    'edit',    'Editar revendas'),
    ('resales',    'delete',  'Remover revendas'),
    ('resales',    'assign',  'Atribuir revendas'),
    -- dashboard
    ('dashboard',  'view',    'Visualizar dashboard'),
    ('dashboard',  'export',  'Exportar dashboard'),
    -- financial
    ('financial',  'view',    'Visualizar financeiro'),
    ('financial',  'edit',    'Editar financeiro'),
    ('financial',  'export',  'Exportar financeiro'),
    -- imports
    ('imports',    'upload',  'Fazer upload de arquivos'),
    ('imports',    'process', 'Processar importações'),
    ('imports',    'view',    'Visualizar importações'),
    -- reports
    ('reports',    'view',    'Visualizar relatórios'),
    ('reports',    'export',  'Exportar relatórios'),
    -- audit
    ('audit',      'view',    'Visualizar logs de auditoria'),
    -- settings
    ('settings',   'manage',  'Gerenciar configurações do sistema');

-- ----------------------------------------
-- Role ↔ Permissions (super_admin recebe tudo)
-- ----------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin';

-- revendedor: apenas visualizar e interagir com revendas atribuídas
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'resales'   AND p.action IN ('view','edit'))
    OR (p.module = 'dashboard' AND p.action = 'view')
)
WHERE r.name = 'revendedor';

-- supervisor: revendas + dashboard + relatórios
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'resales'   AND p.action IN ('view','edit','assign'))
    OR (p.module = 'dashboard' AND p.action IN ('view','export'))
    OR (p.module = 'reports'   AND p.action = 'view')
)
WHERE r.name = 'supervisor';

-- gerente_regional: tudo do supervisor + financeiro view + export relatórios
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'resales'   AND p.action IN ('view','edit','assign','create'))
    OR (p.module = 'dashboard' AND p.action IN ('view','export'))
    OR (p.module = 'reports'   AND p.action IN ('view','export'))
    OR (p.module = 'financial' AND p.action = 'view')
)
WHERE r.name = 'gerente_regional';

-- financeiro: financeiro completo + dashboard
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'financial' AND p.action IN ('view','edit','export'))
    OR (p.module = 'dashboard' AND p.action IN ('view','export'))
    OR (p.module = 'resales'   AND p.action = 'view')
)
WHERE r.name = 'financeiro';

-- backoffice: imports + resales + relatórios
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'imports'   AND p.action IN ('upload','process','view'))
    OR (p.module = 'resales'   AND p.action IN ('view','edit','create'))
    OR (p.module = 'reports'   AND p.action IN ('view','export'))
    OR (p.module = 'dashboard' AND p.action = 'view')
)
WHERE r.name = 'backoffice';

-- auditoria: read-only em tudo
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.action IN ('view')
WHERE r.name = 'auditoria';

-- ----------------------------------------
-- Resale Statuses (status padronizados)
-- ----------------------------------------
INSERT INTO resale_statuses (code, name, stage_group, sort_order) VALUES
    ('01_angariacao',             '01. Angariação',                    'captacao',     1),
    ('01_vendida',                '01. Vendida',                       'captacao',     2),
    ('02_liberada_pra_venda',     '02. Liberada pra Venda',            'comercial',    3),
    ('02_cancelada',              '02. Cancelada',                     'comercial',    4),
    ('03_agendada_cartorio',      '03. Agendada Cartório',             'cartorio',     5),
    ('03_analise_juridica',       '03. Análise Jurídica',              'cartorio',     6),
    ('04_escritura_assinada',     '04. Escritura Assinada',            'cartorio',     7),
    ('05_registro_andamento',     '05. Registro em Andamento',         'registro',     8),
    ('06_registrada',             '06. Registrada',                    'registro',     9),
    ('07_concluida',              '07. Concluída',                     'finalizado',  10),
    ('08_distrato',               '08. Distrato',                      'finalizado',  11);

-- ----------------------------------------
-- Componentes financeiros (catálogo)
-- ----------------------------------------
INSERT INTO resale_financial_components (code, name, component_type, default_order, is_required) VALUES
    ('financiamento',   'Financiamento',          'receita',    1,  true),
    ('subsidio',        'Subsídio',               'receita',    2,  false),
    ('fgts',            'FGTS',                   'receita',    3,  false),
    ('endividamento',   'Endividamento',           'despesa',    4,  false),
    ('jdo',             'JDO',                    'despesa',    5,  false),
    ('documentacao',    'Documentação',            'despesa',    6,  false),
    ('laudo',           'Laudo',                  'despesa',    7,  false),
    ('iptu',            'IPTU',                   'despesa',    8,  false),
    ('comissao',        'Comissão',                'despesa',    9,  true),
    ('valor_venda',     'Valor de Venda',          'referencia', 0,  true),
    ('valor_avaliacao', 'Valor de Avaliação',      'referencia', 0,  false);

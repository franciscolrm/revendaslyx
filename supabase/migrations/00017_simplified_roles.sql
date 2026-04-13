-- ============================================================
-- MIGRATION 00017: Simplified Roles
-- Consolida 9 roles em 4: admin, operacional, financeiro, auditoria
-- Adiciona permissões faltantes para módulos CRM
-- ============================================================

-- 1. Garantir que todas as permissões existem
INSERT INTO permissions (module, action, description) VALUES
  ('dashboard', 'view', 'Ver dashboard'),
  ('dashboard', 'export', 'Exportar dashboard'),
  ('financial', 'view', 'Ver financeiro'),
  ('financial', 'edit', 'Editar financeiro'),
  ('financial', 'export', 'Exportar financeiro'),
  ('resales', 'view', 'Ver revendas'),
  ('resales', 'create', 'Criar revenda'),
  ('resales', 'edit', 'Editar revenda'),
  ('resales', 'delete', 'Deletar revenda'),
  ('imports', 'view', 'Ver importações'),
  ('imports', 'upload', 'Importar arquivos'),
  ('reports', 'view', 'Ver relatórios'),
  ('reports', 'export', 'Exportar relatórios'),
  ('audit', 'view', 'Ver auditoria'),
  ('users', 'view', 'Ver usuários'),
  ('users', 'create', 'Criar usuário'),
  ('users', 'edit', 'Editar usuário'),
  ('users', 'delete', 'Deletar usuário'),
  ('settings', 'manage', 'Gerenciar configurações')
ON CONFLICT (module, action) DO NOTHING;

-- 2. Criar 4 novos roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Acesso total ao sistema'),
  ('operacional', 'Uso operacional do CRM'),
  ('financeiro', 'Acesso financeiro e leitura operacional'),
  ('auditoria', 'Leitura geral sem edição')
ON CONFLICT (name) DO NOTHING;

-- 3. admin = TODAS as permissões
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'admin'), p.id FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. operacional = CRM operacional completo
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'operacional'), p.id FROM permissions p
WHERE (p.module = 'dashboard' AND p.action IN ('view', 'export'))
   OR (p.module = 'resales' AND p.action IN ('view', 'create', 'edit'))
   OR (p.module = 'clients' AND p.action IN ('view', 'create', 'edit'))
   OR (p.module = 'units' AND p.action IN ('view', 'create', 'edit'))
   OR (p.module = 'processes' AND p.action IN ('view', 'create', 'edit', 'advance'))
   OR (p.module = 'financial' AND p.action = 'view')
   OR (p.module = 'imports' AND p.action IN ('view', 'upload'))
   OR (p.module = 'reports' AND p.action IN ('view', 'export'))
   OR (p.module = 'documents' AND p.action IN ('view', 'upload', 'validate'))
   OR (p.module = 'tasks' AND p.action IN ('view', 'create', 'edit', 'complete'))
   OR (p.module = 'activities' AND p.action IN ('view', 'create'))
   OR (p.module = 'notifications' AND p.action = 'view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. financeiro = financeiro + leitura
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'financeiro'), p.id FROM permissions p
WHERE (p.module = 'financial' AND p.action IN ('view', 'edit', 'export'))
   OR (p.module = 'dashboard' AND p.action IN ('view', 'export'))
   OR (p.module = 'resales' AND p.action = 'view')
   OR (p.module = 'clients' AND p.action = 'view')
   OR (p.module = 'units' AND p.action = 'view')
   OR (p.module = 'processes' AND p.action = 'view')
   OR (p.module = 'imports' AND p.action = 'view')
   OR (p.module = 'reports' AND p.action IN ('view', 'export'))
   OR (p.module = 'notifications' AND p.action = 'view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 6. auditoria = view-only em tudo
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'auditoria'), p.id FROM permissions p
WHERE p.action = 'view'
   OR (p.module = 'audit' AND p.action = 'view')
   OR (p.module = 'reports' AND p.action IN ('view', 'export'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

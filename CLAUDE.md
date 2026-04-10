# Revendas — Sistema de Gestão de Revendas Imobiliárias

## Stack
- **DB**: Supabase (PostgreSQL + Auth + Storage)
- **Backend**: NestJS (TypeScript) — `backend/`
- **Frontend**: Next.js 14 App Router + Tailwind + React Query — `frontend/`

## Estrutura

```
supabase/migrations/   — 00001 a 00007 (schema, seed, RLS, fixes, functions, views, storage)
backend/src/           — NestJS modules (auth, resales, users, financial, imports, dashboard, org)
frontend/src/          — Next.js pages, hooks, components, contexts
```

## Convenções

### Backend (NestJS)
- Cada domínio é um module com controller + service + dto
- Auth global via `AuthGuard` — usar `@Public()` para endpoints abertos
- Permissões via `@Permissions({ module: 'x', action: 'y' })`
- Acesso ao Supabase via `SupabaseService` (`.admin` para service_role, `.forUser(token)` para RLS)
- DTOs usam `class-validator` + `@nestjs/swagger`

### Frontend (Next.js)
- Hooks React Query em `src/hooks/` — prefixo `use-`
- API client centralizado em `src/lib/api.ts` (axios com interceptors de token)
- Rotas autenticadas dentro de `app/(auth)/`
- Componentes reutilizáveis em `src/components/`

### Database
- Organograma hierárquico: company > region > branch > team > user
- Permissões: roles → role_permissions → permissions (module + action)
- Escopo: access_scopes (own, team, branch, region, global)
- Financeiro: modelo EAV (resale_financial_components + resale_financial_values)
- Importação: pipeline staging_raw_records → process_import_batch() → resales

## Para rodar
```bash
cd backend && npm install && npm run start:dev   # :3001, Swagger em /docs
cd frontend && npm install && npm run dev         # :3000, proxy /api → backend
```

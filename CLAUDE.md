# BusinessHub — Memória do Projeto

> Ver também `AGENTS.md` (gerado pelo Next.js — regras específicas da versão do framework instalada).

## Visão do produto
Plataforma Enterprise SaaS modular (não apenas um Portal de Fornecedores). Módulos planejados: Supplier Portal, SRM, CRM, CLM, Procurement (eProc), Workflow/BPM, Gestão de Projetos, Gestão de Documentos, Risk Management, ESG, Dashboards, Analytics, AI Agents, Automações, Marketplace de módulos, APIs públicas, Integrações. Nenhum módulo depende diretamente de outro — tudo conversa via serviços bem definidos.

Referência conceitual de mercado: SAP Business Network, Oracle Fusion, ServiceNow, Coupa, Ivalua, Jaggaer.

## Stack tecnológica
- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS, shadcn/ui, Framer Motion, React Hook Form, Zod, TanStack Query, next-intl (i18n: en-US, zh-CN, es, ja)
- **Backend**: Supabase (PostgreSQL, Storage, Auth, Edge Functions)
- **Infra**: Docker, Docker Compose, GitHub (`github.com/AlexKondo/businesshub`), Coolify já instalado sobre Ubuntu 24.04 em VPS Hostinger (Brazil - Campinas, KVM 2, 2 vCPU / 8GB RAM / 100GB disco), SSL, deploy automático, ambientes de produção e homologação
  - Credenciais/IP/SSH da VPS NÃO devem ser registrados neste arquivo nem em nenhum arquivo versionado — gerenciar via variáveis de ambiente no Coolify.

## Regras inegociáveis de segurança e RBAC
Ver skill completa: `.agent/skills/platform-security-rbac/SKILL.md`
- Multi-tenant desde o dia 1 via `tenant_id` (nunca `supplier_id`/dado do client como base de autorização)
- RLS sempre habilitada, fail-closed, testada com acesso cruzado entre tenants
- RBAC: Role, Permission e mapeamento sempre separados; autorização no backend sempre por permission
- Auth preparada para federação (OAuth/Azure AD/Entra ID/Google/Okta/Keycloak/Auth0/OIDC/SAML) via modelo user/identity separado
- Audit logs em toda ação sensível; soft delete em entidades de valor de auditoria/contrato
- LGPD mapeada desde a Fase 1

## Design System
Ver skill completa: `.agent/skills/platform-design-system/SKILL.md`
- **Conceito aprovado: "Structured Neutral"** (2026-07-21) — inspiração Stripe/Linear/Vercel, paleta neutra + azul de marca (`#2547D0` light / `#6C86FF` dark), tipografia Inter única, ícones lucide-react, sem ilustração figurativa, motion 200-250ms sem parallax. Tokens completos já na skill.
- Theme Toggle (claro/escuro) e Language Toggle (EN-US/ZH-CN/ES/JA) obrigatórios desde a Fase 1, mesmo componente em toda tela

## Decisões arquiteturais (ADRs resumidos)
- **Nome do produto**: BusinessHub (confirmado pelo usuário, não é apenas nome de pasta).
- **eProc existente**: será migrado/transferido para o banco do BusinessHub futuramente. Schema da Fase 1 desenhado para não exigir redesenho do `tenant_id`/RBAC quando essa migração acontecer.
- **Infra**: já provisionada (Coolify + VPS Hostinger), não nasce nesta fase — só integração/deploy.
- **Repositório**: `github.com/AlexKondo/businesshub.git`, git inicializado localmente em 2026-07-20.
- **Supabase**: projeto `wqyotbngpavpueyinjvw` (South America / conectado via pooler `aws-1-us-east-2`), credenciais em `.env` (nunca versionado), conexão testada com sucesso em 2026-07-20.
- **E-mail transacional**: Brevo (SMTP), não o serviço de e-mail padrão do Supabase (limitado/rate-limited, não serve para produção). Configurado em `supabase/config.toml` (`[auth.email.smtp]`) para o ambiente local via variáveis de ambiente. Domínio `businesshub.app.br` (registrado no Registro.br) verificado na Brevo (SPF/DKIM/DMARC) em 2026-07-21 — confirmado pelo usuário. **Ainda pendente**: replicar a mesma config de SMTP no projeto Supabase hospedado (Dashboard → Authentication → Sign In / Providers → SMTP Settings), que não lê o `config.toml`.
- **Ordem Fase 1a vs. branding**: fundação técnica (schema, RLS, auth) começou antes dos 3 conceitos de branding, porque nenhuma decisão de branding bloqueia trabalho de backend, e é onde está o maior risco técnico do projeto.
- **Scaffold**: projeto criado com `create-next-app@latest` (Next.js 15, TypeScript, Tailwind, App Router, `src/` dir, alias `@/*`) em 2026-07-20.

## Estado atual do roadmap
- [x] Passo Zero: skills de governança (`platform-security-rbac`, `platform-design-system`) e este `CLAUDE.md` criados
- [x] Git inicializado e remote `origin` configurado
- [x] Nome do produto, infra e estratégia de eProc confirmados pelo usuário
- [x] Subdivisão da Fase 1 em 1a (fundação técnica)/1b (núcleo do produto)/1c (portal fornecedor + landing) — aprovada em 2026-07-20
- [x] Supabase conectado e testado
- [x] Scaffold Next.js 15 criado
- [x] Migrations core aplicadas no Supabase real: `companies`, `profiles`/`identities`, `roles`, `permissions`, `role_permissions`, `memberships`, `audit_logs` — RLS habilitada em todas (fail-closed), helpers `user_has_tenant_access`/`user_has_permission`, seed com 12 permissions e 7 system roles
- [x] Supabase CLI (`npx supabase`, sem instalação global) + stack local via Docker validados; teste pgTAP `supabase/tests/001_rls_cross_tenant.sql` rodando **6/6 PASS** localmente
- [x] Migration `20260720190200_grants.sql` (GRANTs de tabela para `authenticated` — necessário além da RLS, pois projetos novos não expõem tabelas automaticamente) aplicada tanto local quanto no projeto real
- [x] Autenticação por e-mail (Supabase Auth) com modelo user/identity separado
- [x] Deploy automático no Coolify funcionando ponta a ponta — `https://gwm.businesshub.app.br`, SSL válido via Let's Encrypt, DNS via Cloudflare
- [x] 3 conceitos de branding/UX propostos e aprovados: **Conceito 1 "Structured Neutral"**
- [x] Tokens definitivos aplicados em `platform-design-system/SKILL.md`
- [x] Landing page real (i18n completo: en-US, zh-CN, es, ja), Theme Toggle e Language Toggle funcionais
- [x] Telas de login e cadastro reais (`/[locale]/login`, `/[locale]/signup`) com Supabase Auth, React Hook Form + Zod, `/auth/callback` para confirmação de e-mail
- [ ] Dashboard autenticado (Fase 1b) — próximo passo
- [ ] Deploy da versão atual (com as páginas novas) no Coolify — só o scaffold padrão do Next.js foi deployado até agora, as telas reais ainda não subiram

Este arquivo deve ser atualizado ao final de cada fase aprovada.

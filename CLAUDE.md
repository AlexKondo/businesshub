# BusinessHub — Memória do Projeto

> Ver também `AGENTS.md` (gerado pelo Next.js — regras específicas da versão do framework instalada).

## Visão do produto
Plataforma Enterprise SaaS modular (não apenas um Portal de Fornecedores). Módulos planejados: Supplier Portal, SRM, CRM, CLM, Procurement (eProc), Workflow/BPM, Gestão de Projetos, Gestão de Documentos, Risk Management, ESG, Dashboards, Analytics, AI Agents, Automações, Marketplace de módulos, APIs públicas, Integrações. Nenhum módulo depende diretamente de outro — tudo conversa via serviços bem definidos.

Referência conceitual de mercado: SAP Business Network, Oracle Fusion, ServiceNow, Coupa, Ivalua, Jaggaer.

## Stack tecnológica
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, TailwindCSS v4, lucide-react, React Hook Form, Zod, next-intl (i18n: en-US, zh-CN, es, ja, pt-BR), next-themes
- **Backend**: Supabase (PostgreSQL, Storage, Auth), nodemailer (envio via SMTP Brevo)
- **Infra**: Docker, GitHub (`github.com/AlexKondo/businesshub`), Coolify sobre Ubuntu 24.04 em VPS Hostinger (Brazil - Campinas, KVM 2, 2 vCPU / 8GB RAM / 100GB disco), Cloudflare (DNS + proxy, modo SSL "Full")
  - Credenciais/IP/SSH da VPS NÃO devem ser registradas neste arquivo nem em arquivo versionado — vivem em `.env` local (gitignored) e nas env vars do Coolify.

## Arquitetura multi-tenant
- **Um único deploy/container** para todos os tenants — nunca infra nova por empresa. Isolamento acontece via RLS (dados) + roteamento por subdomínio (UX), não via infraestrutura separada.
- **Domínio raiz** (`businesshub.app.br`) = marketing + login/signup/onboarding, nunca mostra dados de tenant.
- **Subdomínio por tenant** (`{slug}.businesshub.app.br`) = área logada daquele tenant. `companies.slug` é o identificador público/URL; `companies.tax_id` (CNPJ, genérico no schema para outros países no futuro) é o identificador real usado para deduplicar onboarding.
- Coolify **não suporta domínio curinga via API** (`*.dominio` é rejeitado pela validação) — cada subdomínio de tenant precisa ser registrado explicitamente (`domains` da aplicação) e um redeploy disparado para o Traefik aplicar o novo Host rule. Isso é automatizado em `/api/tenants/register-domain` e `/api/tenants/onboard`, chamado no momento da criação do tenant (leva ~1-3min, UI mostra "provisionando").
- Cloudflare precisa estar em modo **"Full"** (não "Flexible", não "Full (strict)") — Flexible causa loop de redirect HTTP→HTTPS (Traefik sempre redireciona para https, e Cloudflare Flexible fala HTTP com a origem); Full (strict) rejeita o certificado autoassinado que o Traefik usa para domínios sem Let's Encrypt.
- `src/proxy.ts` (nome novo do `middleware.ts` no Next 16) faz o gate de subdomínio: usuário sem sessão ou sem membership naquele tenant é redirecionado para o domínio raiz — usando um client Supabase próprio para middleware (`@supabase/ssr`).

## Onboarding e RBAC — fluxo completo (Fase 1b/1c)
Ver skill completa: `.agent/skills/platform-security-rbac/SKILL.md`
- **Super usuário de plataforma** (`platform_admins`, tabela separada do RBAC por tenant): `alexandre.kondo@gmail.com` é o único hoje. Só ele pode alterar/revogar acesso de um admin de tenant. Helper `is_platform_admin()`.
- **Onboarding self-service por CNPJ** (`/api/tenants/onboard`):
  - CNPJ novo (não existe `companies.tax_id` igual) → cria a empresa, usuário vira `Administrador da Empresa` direto (`status = active`)
  - CNPJ já existe → cria `membership` com `status = pending`, `role_id = null`; todos os admins ativos do tenant recebem e-mail (Brevo/nodemailer) e aprovam pela tela de Administração, escolhendo a role na hora
  - Validação de CNPJ com dígito verificador real (`src/lib/cnpj.ts`), não só formato
- **Nenhum admin de tenant consegue alterar/revogar outro admin** — nem quem promoveu a pessoa. Só um `platform_admin` pode. Aplicado via RLS (`memberships_write` policy verifica se a role atual da linha é `Administrador da Empresa`; se for, bloqueia UPDATE/DELETE por não-platform-admin). Promover alguém A admin ainda é permitido (a policy olha a role *antes* da alteração).
  - **Bug real corrigido nessa policy**: `role_id not in (subquery)` com `role_id IS NULL` (caso das pendências) avalia para `NULL` em SQL, não `TRUE`/`FALSE` — e RLS trata `NULL` como reprovado. Sem o `or role_id is null` explícito, admins nunca conseguiriam aprovar ninguém.

## Design System
Ver skill completa: `.agent/skills/platform-design-system/SKILL.md`
- **Conceito aprovado: "Structured Neutral"** (2026-07-21) — inspiração Stripe/Linear/Vercel, paleta neutra + azul de marca (`#2547D0` light / `#6C86FF` dark), tipografia Inter única, ícones lucide-react, sem ilustração figurativa, motion 200-250ms sem parallax. Tokens completos já na skill.
- Theme Toggle (claro/escuro, persistido via `next-themes`/localStorage) e Language Toggle (EN-US/ZH-CN/ES/JA/PT-BR, persistido via cookie do next-intl) obrigatórios desde a Fase 1, mesmo componente em toda tela — escolha do usuário nunca é perguntada de novo.

## Decisões arquiteturais (ADRs resumidos)
- **Nome do produto**: BusinessHub.
- **eProc existente**: será migrado/transferido para o banco do BusinessHub futuramente. Schema desenhado para não exigir redesenho do `tenant_id`/RBAC quando isso acontecer.
- **Infra**: já provisionada (Coolify + VPS Hostinger), não nasce nesta fase — só integração/deploy.
- **Repositório**: `github.com/AlexKondo/businesshub.git`.
- **Supabase**: projeto `wqyotbngpavpueyinjvw` (South America), credenciais em `.env` (nunca versionado).
- **E-mail transacional**: Brevo, tanto para Supabase Auth (SMTP nativo, configurado no Dashboard hospedado) quanto para notificações da própria aplicação (nodemailer, `src/lib/mail.ts`). Domínio `businesshub.app.br` verificado (SPF/DKIM/DMARC).
- **`.env` local tem o token de API do Coolify** (`COOLIFY_API_TOKEN`) — replicado como env var no próprio app deployado, porque a automação de registro de subdomínio roda a partir do backend da aplicação. É um token "root" (sem escopo granular na versão atual do Coolify) — risco aceito conscientemente, guardar como segredo real.
- **`npm ci` no Coolify é estrito sobre lockfile** — qualquer `npm install` local que só atualiza `package.json` sem sincronizar 100% o `package-lock.json` (aconteceu 2x nesta sessão, com `@swc/helpers` faltando) quebra o deploy. Sempre rodar `npm install` limpo (remover `node_modules`+lockfile) antes de commitar após adicionar dependência nova.
- **`node_modules` dentro do OneDrive causa lentidão severa** (`npm install` limpo levou de 9 a 26 minutos nesta máquina) — recomendado excluir a pasta do sync do OneDrive.

## Estado atual do roadmap
- [x] Passo Zero, fundação técnica (Fase 1a): schema core, RLS, RBAC, Supabase conectado — ver histórico de commits para detalhe
- [x] Branding aprovado, tokens aplicados
- [x] Landing page real, i18n 5 idiomas, Theme/Language Toggle
- [x] Autenticação (login/signup/confirmação de e-mail) com Supabase Auth
- [x] Dashboard autenticado + Perfil (Fase 1b)
- [x] Deploy automático no Coolify funcionando ponta a ponta, domínio raiz + subdomínios
- [x] Roteamento multi-tenant por subdomínio (`proxy.ts`)
- [x] Onboarding self-service por CNPJ + fluxo de aprovação + tela de Administração
- [x] Proteção de admin (nenhum admin revoga outro; só platform_admin)
- [ ] **Testar ponta a ponta**: criar tenant novo via onboarding, testar fluxo de CNPJ já existente (pending → aprovação → role), confirmar e-mails chegando
- [ ] Módulos de negócio (Fornecedores, Contratos, Documentos, Pedidos) — hoje só placeholders "em breve" na sidebar
- [ ] Migração do eProc existente
- [ ] LGPD: base legal, retenção, exclusão/anonimização (mapeado na skill, não implementado ainda)
- [ ] Audit logs: tabela existe desde a Fase 1a, mas nenhuma ação da aplicação ainda grava nela de fato

Este arquivo deve ser atualizado ao final de cada fase aprovada.

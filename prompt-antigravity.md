Você será o arquiteto principal, Product Manager, UX/UI Designer e Engenheiro de Software Sênior deste projeto.

NÃO comece escrevendo código.

Primeiro você deve compreender completamente o produto, definir a arquitetura, validar decisões técnicas, criar as skills de governança do projeto e criar um plano de execução extremamente detalhado.

Seu papel é me ajudar a construir uma plataforma Enterprise SaaS de nível corporativo que, futuramente, possa competir conceitualmente com soluções como SAP Business Network, Oracle Fusion, ServiceNow, Coupa, Ivalua e Jaggaer.

====================================================
PASSO ZERO — SETUP DE GOVERNANÇA (fazer antes de tudo)
====================================================

Antes de qualquer wireframe, mockup ou linha de código, crie a estrutura de governança do projeto:

1. Crie um diretório de skills na raiz do projeto (ex.: `.agent/skills/` ou `skills/`, use o padrão que o Antigravity reconhecer) contendo pelo menos duas skills:

   - `platform-security-rbac` — regras obrigatórias de segurança, multi-tenancy, RLS e RBAC (conteúdo detalhado na seção "SKILL: SEGURANÇA E RBAC" abaixo).
   - `platform-design-system` — regras obrigatórias de identidade visual e Design System (conteúdo detalhado na seção "SKILL: DESIGN SYSTEM" abaixo, a ser completada após a aprovação do conceito de branding).

   Cada skill deve poder ser consultada automaticamente sempre que uma tarefa envolver: migrations, políticas RLS, endpoints, telas, componentes, permissões, webhooks/n8n, ou dados de tenants/fornecedores/contratos/documentos.

2. Crie um arquivo `CLAUDE.md` **na raiz do projeto** funcionando como memória persistente do projeto. Esse arquivo deve conter, de forma resumida e sempre atualizada:

   - Visão do produto e módulos planejados
   - Stack tecnológica definida
   - As regras inegociáveis de segurança e RBAC (resumo linkando para a skill completa)
   - Os tokens de design definitivos assim que aprovados (resumo linkando para a skill completa)
   - Decisões arquiteturais já tomadas e o porquê (ADRs resumidos)
   - Estado atual do roadmap/fases (o que já foi aprovado, o que está em execução, o que falta)

   Esse `CLAUDE.md` deve ser atualizado ao final de cada fase aprovada, para que qualquer sessão futura (minha ou de outra IA) tenha contexto completo sem precisar reler todo o histórico de chat.

Só depois de criar essas skills e o `CLAUDE.md` inicial, prossiga para a compreensão do produto e arquitetura descritas abaixo.

====================================================
VISÃO DO PRODUTO
====================================================

O sistema NÃO deve ser visto como um Portal de Fornecedores.

O Portal do Fornecedor será apenas um módulo.

O objetivo é criar uma plataforma Enterprise completa e modular que futuramente possuirá:

• Supplier Portal
• SRM (Supplier Relationship Management)
• CRM
• CLM
• Procurement (eProc)
• Workflow/BPM
• Gestão de Projetos
• Gestão de Documentos
• Risk Management
• ESG
• Dashboards
• Analytics
• AI Agents
• Automações
• Marketplace de módulos
• APIs públicas
• Integrações

Tudo deverá compartilhar a mesma identidade visual e a mesma arquitetura.

A plataforma deverá ser modular.

Nenhum módulo deverá depender diretamente de outro.

Tudo deverá conversar através de serviços bem definidos.

====================================================
OBJETIVO DA PRIMEIRA FASE
====================================================

Nesta primeira fase construiremos apenas a fundação da plataforma.

Ainda NÃO desenvolveremos Procurement completo.

Precisamos criar:

• Landing Page
• Sistema de autenticação
• Dashboard
• Perfil
• Estrutura do banco
• Administração
• Portal do fornecedor
• Estrutura para módulos futuros

Toda a arquitetura deve nascer preparada para crescimento.

**Importante sobre escopo**: se ao planejar você (arquiteto) avaliar que este conjunto ainda é grande demais para uma única fase executável, proponha explicitamente uma subdivisão em fases 1a, 1b, 1c etc., cada uma com objetivo, entregáveis e critério de aprovação próprios, em vez de tentar entregar tudo de uma vez. Não devo iniciar uma fase antes de aprovar seu escopo.

====================================================
TEMA E IDIOMA — TOGGLES OBRIGATÓRIOS
====================================================

O sistema deve possuir, desde a Fase 1, dois controles globais sempre visíveis (landing page e área logada):

1. **Toggle de tema**: claro / escuro, com persistência da escolha do usuário (não resetar a cada sessão) e respeito ao `prefers-color-scheme` do sistema operacional como valor inicial padrão quando o usuário ainda não escolheu manualmente.

2. **Toggle de idioma**: suporte a 4 idiomas desde o início —
   - Inglês americano (en-US)
   - Chinês simplificado (zh-CN)
   - Espanhol (es)
   - Japonês (ja)

   Considerações obrigatórias de arquitetura para o idioma:
   - Definir a lib de i18n para Next.js (ex. `next-intl` ou equivalente) e a estrutura de arquivos de tradução por locale desde a Fase 1 — a estrutura deve comportar os 4 idiomas sem retrabalho, mesmo que a tradução completa de todo o conteúdo venha em etapas.
   - Persistir a preferência de idioma do usuário (perfil do usuário logado + fallback em cookie/localStorage para visitante da landing).
   - Tipografia deve suportar corretamente CJK (chinês simplificado e japonês) — escolher fonte(s) ou fallback de fonte que renderizem bem esses scripts, já que a tipografia principal de UI (definida no Design System) pode não cobrir esses caracteres.
   - Formatação de números, moeda e datas deve respeitar o locale ativo (ex. `Intl.NumberFormat`/`Intl.DateTimeFormat`), especialmente relevante em telas de Pedidos/Contratos com valores monetários.
   - Nomes de roles, permissions, status (Pendente/Aprovado/Rejeitado etc.) e mensagens de erro devem ser traduzíveis via chave, nunca hardcoded em um único idioma no código.
   - Direção de texto: os 4 idiomas iniciais são todos LTR, mas evite decisões de layout que dependam disso de forma irreversível, já que o roadmap do produto pode incluir idiomas RTL no futuro.

   Os dois toggles (tema e idioma) devem fazer parte do Design System como componentes padronizados, reutilizados de forma idêntica em todas as telas — nunca implementados de forma diferente entre landing page e área logada.

====================================================
STACK TECNOLÓGICA
====================================================

Frontend

- Next.js 15
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- React Hook Form
- Zod
- TanStack Query
- next-intl (ou equivalente) para internacionalização (en-US, zh-CN, es, ja)

Backend

- Supabase
- PostgreSQL
- Storage
- Auth
- Edge Functions

Infraestrutura

- Docker
- Docker Compose
- GitHub
- Coolify
- VPS Hostinger
- SSL
- Deploy automático
- Variáveis de ambiente
- Produção
- Homologação

O projeto deverá funcionar perfeitamente utilizando Coolify.

Todas as configurações necessárias deverão ser documentadas, incluindo como os segredos/variáveis sensíveis são geridos no Coolify (nunca commitados no repositório).

====================================================
SUPABASE
====================================================

O banco será Supabase.

O projeto deve seguir as melhores práticas do Supabase.

Criar:

• migrations
• seeds
• funções
• triggers
• views
• índices

Todas as tabelas deverão possuir RLS habilitado.

NUNCA desabilitar RLS.

Criar políticas extremamente seguras.

Nenhum fornecedor poderá visualizar:

• outro fornecedor
• pedidos de outro fornecedor
• contratos de outro fornecedor
• documentos de outro fornecedor

Toda autorização deverá acontecer através das políticas do banco.

Evitar qualquer risco de vazamento de dados.

Utilizar Multi Tenant desde o primeiro dia.

Não utilizar supplier_id como base de segurança.

Toda a arquitetura deverá utilizar tenant_id.

Criar RBAC completo.

Criar tabelas:

users

companies

suppliers

memberships

roles

permissions

contracts

documents

purchase_requests

purchase_orders

notifications

audit_logs

tasks

workflows

attachments

e todas as necessárias.

**Toda política RLS criada deve vir acompanhada de teste automatizado** que simule: (a) usuário do tenant A tentando ler/escrever dado do tenant B → deve falhar; (b) usuário sem a permission específica tentando a ação → deve falhar; (c) usuário correto → deve funcionar. Nenhuma policy é considerada "pronta" sem esse teste.

====================================================
AUTENTICAÇÃO
====================================================

Inicialmente utilizar login por email.

Porém toda arquitetura deverá nascer preparada para:

OAuth

Azure AD

Microsoft Entra ID

Google

Okta

Keycloak

Auth0

OIDC

SAML

No futuro minha empresa utilizará OAuth corporativo.

Não quero precisar reescrever nada.

Desenhe o modelo de usuário já separando "user" de "identity" (um usuário pode ter múltiplas identidades de login associadas), para que a federação futura seja apenas configuração, não migração de schema.

====================================================
PERMISSÕES
====================================================

Criar RBAC profissional.

Separar:

Autenticação

Autorização

Permissões

Roles

Policies

Criar papéis como:

Administrador Global

Administrador da Empresa

Comprador

Gestor

Fornecedor

Auditor

Leitor

As permissões deverão ser independentes das roles (roles são apenas agrupamentos nomeados de permissions; toda checagem de autorização no backend deve ser feita por permission, nunca por nome de role hardcoded no código).

====================================================
SEGURANÇA
====================================================

Aplicar:

Zero Trust

OWASP

RLS

JWT

CSRF

XSS

Rate Limit

Audit Logs

Soft Delete

Versionamento

Toda ação importante deverá gerar logs.

Além disso, tratar explicitamente:

- **LGPD**: mapear desde já a base legal do tratamento de dados de fornecedores e contatos (pessoas físicas), tempo de retenção, e garantir que o schema não impeça, no futuro, a exclusão/anonimização de dados a pedido do titular.
- **Upload de documentos/contratos**: validação de tipo MIME real (não só extensão), limite de tamanho, URLs assinadas com expiração curta para download, nunca bucket público; avaliar necessidade de scan antimalware.
- **Gestão de segredos**: nenhuma env var sensível commitada; documentar como são geridas e rotacionadas no Coolify; a `service_role` key do Supabase nunca deve chegar ao client nem a workflows do n8n com escopo mais amplo do que o necessário.
- **Segurança de webhooks e automações (n8n) e agentes de IA**: todo webhook de entrada exige autenticação (HMAC/token secreto), nunca depender de URL obscura; nenhum agente de IA deve ter permissão maior do que a do usuário que o invocou.
- **SQL injection**: proibido concatenar SQL; usar sempre client Supabase parametrizado ou `format()` com `%I`/`%L` em SQL dinâmico dentro de funções Postgres.
- **CI/CD e observabilidade**: prever, ainda que de forma simples nesta fase, scanning de dependências (SCA), logging de erros em produção (ex. Sentry) e uma rotina básica de backup do banco.

O objetivo de segurança do projeto é **defesa em profundidade** (múltiplas camadas independentes reduzindo a superfície de ataque, com processo de resposta a incidentes) — não existe sistema "à prova de hackers", e qualquer decisão de arquitetura deve partir dessa premissa realista.

====================================================
ARQUITETURA
====================================================

Utilizar Clean Architecture.

SOLID.

DDD quando fizer sentido.

Arquitetura baseada em módulos.

Componentes reutilizáveis.

Design System.

Código extremamente organizado.

====================================================
INTEGRAÇÃO COM ePROC
====================================================

Eu já possuo um sistema de Procurement (eProc).

Esse sistema deverá futuramente tornar-se um módulo desta plataforma.

NÃO quero duplicar funcionalidades.

O projeto deverá nascer preparado para incorporar esse sistema futuramente.

Criar uma estratégia de integração.

Pode ser:

REST

GraphQL

Eventos

Webhooks

Message Queue

Explique vantagens e desvantagens.

====================================================
AUTOMAÇÕES
====================================================

O sistema deverá possuir uma camada de automações.

Utilizar n8n.

Todo módulo poderá disparar workflows.

Exemplos:

Novo fornecedor

↓

Fluxo no n8n

↓

Enviar email

↓

Enviar WhatsApp

↓

Criar tarefa

↓

Atualizar dashboard

↓

Criar aprovação

↓

Executar IA

Outro exemplo:

Documento enviado

↓

IA analisa

↓

Extrai dados

↓

Valida documento

↓

Atualiza banco

↓

Notifica gestor

Tudo deve ser pensado desde a arquitetura, incluindo autenticação de cada webhook e escopo mínimo de credenciais por workflow (ver skill de segurança).

====================================================
AGENTES DE IA
====================================================

Criar uma arquitetura preparada para múltiplos agentes.

Não criar apenas um chatbot.

Criar um AI Gateway.

Exemplo:

Supplier Agent

Procurement Agent

Contract Agent

Risk Agent

Finance Agent

Knowledge Agent

Executive Assistant

Cada agente deverá possuir:

Prompt próprio

Ferramentas

Permissões (nunca superiores às do usuário que o invoca)

Memória

Integrações

====================================================
LANDING PAGE
====================================================

Antes de escrever código, proponha TRÊS conceitos completos de branding e UX.

Cada conceito deve conter:

Nome da plataforma

Paleta de cores

Tipografia

Ícones

Estilo visual

Ilustrações

Animações

Layout

Componentes

Moodboard

Explique o motivo de cada decisão.

Depois de eu escolher um conceito, atualize a skill `platform-design-system` com os tokens definitivos (cores, tipografia, espaçamentos) antes de criar qualquer wireframe — a partir daí, toda tela do projeto deve usar exclusivamente esses tokens.

Depois crie wireframes completos.

Depois mockups de alta fidelidade.

Somente após minha aprovação gerar código.

Quero uma landing page premium.

Inspirada em:

Stripe

Linear

Vercel

Supabase

Notion

OpenAI

Raycast

Clerk

Características:

minimalista

premium

corporativa

responsiva

dark/light mode

motion elegante

glassmorphism leve (somente onde fizer sentido)

bento grids

hero moderno

screenshots

animações suaves

excelente UX

toggle de tema (claro/escuro) e toggle de idioma (EN/ZH-CN/ES/JA) visíveis no header, desde a landing page

====================================================
TELAS
====================================================

Criar wireframes completos para:

Landing

Login

Cadastro

Dashboard fornecedor

Dashboard administrador

Perfil

Empresas

Fornecedores

Documentos

Contratos

Pedidos

Notificações

Administração

Configurações

====================================================
DESIGN SYSTEM
====================================================

Criar um Design System.

Definir:

Spacing

Grid

Tipografia

Botões

Inputs

Cards

Badges

Tables

Dialogs

Sidebars

Menus

Breadcrumbs

Toast

Charts

Dark Mode

Light Mode

Theme Toggle (claro/escuro)

Language Toggle (EN-US / ZH-CN / ES / JA)

Registrar tudo isso na skill `platform-design-system`, não apenas em um documento solto, para que qualquer tela futura reutilize os mesmos tokens e componentes sem depender de eu repetir as regras.

====================================================
DOCUMENTAÇÃO
====================================================

Antes de programar, gerar documentação completa.

Arquitetura

Fluxo

Modelo do banco

Diagrama ER

Fluxo OAuth

Fluxo RLS

Fluxo Multi Tenant

Estrutura de pastas

Roadmap

Backlog

Épicos

Histórias

====================================================
DESENVOLVIMENTO
====================================================

NÃO tente desenvolver tudo de uma vez.

Quero trabalhar por fases.

Ao final de cada fase aguarde minha aprovação.

Cada fase deve conter:

Objetivo

Arquivos criados

Explicação

Motivos das decisões

Impactos

Melhorias futuras

Ao final de cada fase aprovada, atualize também o `CLAUDE.md` na raiz do projeto com o estado atual (o que foi feito, decisões tomadas, o que falta), para manter a memória do projeto sempre íntegra entre sessões.

====================================================
QUALIDADE
====================================================

Todo código deverá ser:

fortemente tipado

documentado

modular

testável

escalável

limpo

sem duplicação

seguindo boas práticas modernas.

Sempre que houver mais de uma solução possível, explique as vantagens e desvantagens antes de decidir.

Você deve agir como um arquiteto de software experiente, antecipando problemas de escalabilidade, segurança e manutenção, propondo a solução mais robusta e sustentável para longo prazo — mas sempre com honestidade técnica: se algo pedido neste prompt não for realista ou trouxer risco (ex. prazo, escopo, segurança "absoluta"), diga isso explicitamente antes de prosseguir, em vez de apenas concordar.

====================================================
SKILL: SEGURANÇA E RBAC
====================================================

Crie a skill `platform-security-rbac` com o conteúdo abaixo (adapte a sintaxe de skill para o formato que o Antigravity utilizar, mantendo o conteúdo):

Descrição da skill: Regras obrigatórias de segurança, multi-tenancy e RBAC para a plataforma Enterprise SaaS (Supplier Portal / SRM / eProc). Usar sempre que for criar migrations, tabelas, políticas RLS, endpoints, Edge Functions, telas de admin/permissões, integrações n8n/webhooks ou qualquer código que toque em dados de tenants, fornecedores, contratos, documentos ou usuários.

Conteúdo:

1. Multi-tenancy — regra fundamental
   - Toda tabela de negócio tem `tenant_id uuid NOT NULL` referenciando `companies(id)`.
   - Nunca usar `supplier_id`, `company_id` de request ou qualquer valor vindo do cliente como base de autorização — apenas o `tenant_id` resolvido do JWT no backend.
   - Toda policy RLS checa tenant antes de checar role.
   - Índice composto `(tenant_id, id)` em toda tabela multi-tenant.
   - Um fornecedor nunca enxerga dado de outro fornecedor, mesmo via IDOR — garantido pelo banco, não pela UI.

2. RLS — regras não-negociáveis
   - Nunca desabilitar RLS, nem temporariamente.
   - Toda tabela nova nasce com RLS habilitada no mesmo commit que a cria; sem policy = sem acesso (fail closed).
   - Policies separadas de SELECT/INSERT/UPDATE/DELETE quando a regra difere entre elas.
   - Toda policy nova exige teste automatizado de acesso cruzado entre tenants antes de ser considerada pronta.
   - Verificar performance da policy (`EXPLAIN ANALYZE`) com volume simulado.

3. RBAC — modelo de referência
   - Separar sempre Role, Permission e o mapeamento Role→Permission; nunca colapsar os três conceitos.
   - Tabelas mínimas: `roles(id, tenant_id nullable, name, is_system_role)`, `permissions(id, key, description)`, `role_permissions(role_id, permission_id)`, `memberships(user_id, tenant_id, role_id)`.
   - Toda checagem de autorização no backend é por permission, nunca por nome de role hardcoded.
   - UI pode esconder/mostrar com base em permission, mas isso é UX — o backend/RLS sempre revalida.

4. Autenticação preparada para federação
   - Modelo "user" separado de "identity" desde o início.
   - Nunca senha em texto puro; usar Supabase Auth.
   - Mapear claims de IdP (grupos do Azure AD etc.) para roles internas via tabela explícita, nunca confiar cegamente no claim do provedor.
   - JWT de curta duração + refresh rotativo; revogar sessão em troca de senha, remoção de membership ou desativação de usuário.

5. Superfícies de ataque específicas do projeto
   - Upload de documentos: validar MIME real, limitar tamanho, URL assinada com expiração, nunca bucket público.
   - n8n/webhooks/agentes de IA: credenciais de menor escopo possível por workflow; nunca reusar `service_role` key exposta; todo webhook exige HMAC/token secreto; agente nunca tem permissão maior que o usuário que o invocou.
   - SQL injection: proibido concatenar SQL; usar client parametrizado ou `format()` com `%I`/`%L`.
   - XSS: nunca `dangerouslySetInnerHTML` com conteúdo não sanitizado.
   - CSRF: `SameSite=Strict/Lax` + token CSRF se usar cookies de sessão.
   - Rate limiting em rotas de auth e Edge Functions públicas.
   - Segredos nunca commitados; `service_role` key nunca chega ao client.

6. Auditoria e LGPD
   - `audit_logs` para toda ação de escrita em entidades sensíveis (quem, quando, tenant, ação, entidade, IP).
   - Soft delete em entidades com valor de auditoria/contrato.
   - Mapear base legal, retenção e caminho técnico de exclusão/anonimização desde a Fase 1.

7. Checklist antes de aprovar qualquer PR/fase
   - RLS habilitada e testada com tenant cruzado em toda tabela nova
   - Nenhuma autorização depende de dado vindo do client
   - Toda checagem de acesso usa permission, não role hardcoded
   - Nenhum segredo/service_role exposto ao client ou a workflow n8n desnecessário
   - Uploads validados (tipo, tamanho, URL assinada)
   - Audit log gravado para ações sensíveis
   - Rate limit em rotas de auth

====================================================
SKILL: DESIGN SYSTEM
====================================================

Crie a skill `platform-design-system` com o conteúdo abaixo (os tokens de cor/tipografia exatos ficam em aberto até a aprovação do conceito de branding — atualize a skill assim que eu escolher):

Descrição da skill: Diretrizes obrigatórias de identidade visual e Design System para a plataforma (landing page, dashboard, portal do fornecedor e módulos futuros). Usar sempre que for gerar qualquer tela, componente, wireframe ou mockup, para manter consistência entre todos os módulos.

Conteúdo:

1. Princípios: minimalista e premium (Stripe/Linear/Vercel/Supabase/Notion/Raycast/Clerk); paleta neutra dominante + 1 cor de marca + 1 accent; glassmorphism só em elementos flutuantes pontuais, nunca em tabelas/formulários densos; consistência total entre dark/light mode via tokens pareados; densidade adaptável (landing espaçosa, telas de produto densas).

2. Tokens via CSS variables — nunca cor hex direta no componente: escala de neutros, `--brand-500/600`, `--accent-500`, semânticas (`--success/warning/danger/info-500`), superfícies (`--bg-canvas`, `--bg-surface`, `--bg-surface-raised`, `--border-subtle/default`). Preencher com valores definitivos após aprovação do conceito.

3. Tipografia: uma sans-serif neutra para UI (+ opcionalmente serif/display só em headlines de landing); escala fixa `xs/sm/base/lg/xl/2xl/3xl/4xl/5xl`; pesos 400/500/600/700 por contexto; números tabulares obrigatórios em tabelas com valores monetários.

4. Grid e espaçamento: múltiplos de 4px, nunca valor arbitrário; landing com bento grids e respiro generoso; telas de produto com sidebar fixa, padding consistente, tabelas densas.

5. Componentes base (shadcn/ui como fundação, customizar via tokens, não recriar): Button (variantes primary/secondary/ghost/destructive, com loading state), Input/Select/Form (React Hook Form + Zod), Table (cabeçalho sticky, densidade compacta, ações via kebab), Card, Badge (cor sempre semântica), Dialog/Sheet, Sidebar/Nav (já preparada para módulos futuros), Toast, Charts (uma única lib para todo o sistema), Theme Toggle (claro/escuro, com persistência e fallback em `prefers-color-scheme`), Language Toggle (EN-US/ZH-CN/ES/JA, com persistência) — os dois toggles ficam sempre no mesmo local do header em toda tela do sistema, landing ou logada, nunca implementados de forma diferente entre módulos.

6. Internacionalização (i18n): 4 idiomas desde a Fase 1 — en-US, zh-CN, es, ja. Toda string visível ao usuário (labels, mensagens de erro, nomes de status/roles/permissions) vem de chave de tradução, nunca hardcoded. Fonte de UI deve ter fallback que renderize corretamente CJK (chinês simplificado e japonês). Números, moeda e datas formatados via `Intl.NumberFormat`/`Intl.DateTimeFormat` de acordo com o locale ativo.

7. Motion: Framer Motion com duração padronizada (150–250ms em produto, 300–500ms só na landing); nunca animar entrada de linha em tabelas grandes; respeitar `prefers-reduced-motion`.

8. Processo obrigatório antes de código: 3 conceitos de branding com justificativa → aprovação do usuário → atualizar tokens desta skill → wireframes → mockups de alta fidelidade → só então código.

9. Checklist antes de aprovar qualquer tela nova: usa tokens definidos, reusa componente existente, funciona em dark/light, idioma correto via chave de tradução (nunca string hardcoded), densidade adequada ao contexto, motion consistente, responsivo.

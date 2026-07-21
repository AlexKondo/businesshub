---
name: platform-design-system
description: Diretrizes obrigatórias de identidade visual e Design System para a plataforma (landing page, dashboard, portal do fornecedor e módulos futuros). Usar sempre que for gerar qualquer tela, componente, wireframe ou mockup, para manter consistência entre todos os módulos.
---

# Design System — diretrizes obrigatórias

> **Conceito aprovado em 2026-07-21: "Structured Neutral"** (inspiração Stripe/Linear/Vercel). Tokens definitivos na seção 2.

## 1. Princípios
- Minimalista e premium (referências: Stripe, Linear, Vercel, Supabase, Notion, Raycast, Clerk).
- Paleta neutra dominante + 1 cor de marca + 1 accent.
- Glassmorphism só em elementos flutuantes pontuais, nunca em tabelas/formulários densos.
- Consistência total entre dark/light mode via tokens pareados.
- Densidade adaptável: landing espaçosa, telas de produto densas.

## 2. Tokens via CSS variables — nunca cor hex direta no componente

Definidos como custom properties em `:root` (light), redefinidos em `@media (prefers-color-scheme: dark)` e novamente em `:root[data-theme="dark"]` / `:root[data-theme="light"]` (o atributo sempre vence a media query, nas duas direções).

**Light (padrão)**
```css
--bg-canvas: #fafaf9;
--bg-surface: #ffffff;
--bg-surface-raised: #ffffff;
--border-subtle: #eceeef;
--border-default: #e4e6ea;
--ink: #16181d;
--ink-soft: #5b616e;
--brand-500: #2547d0;
--brand-600: #1c37a8;
--accent-soft: #eef0fd;
--success-500: #16a34a;
--warning-500: #d97706;
--danger-500: #dc2626;
--info-500: #2547d0;
```

**Dark**
```css
--bg-canvas: #0f0f10;
--bg-surface: #17181a;
--bg-surface-raised: #1e1f22;
--border-subtle: #232427;
--border-default: #2b2d31;
--ink: #ededec;
--ink-soft: #9aa0ac;
--brand-500: #6c86ff;
--brand-600: #8a9fff;
--accent-soft: #1b2340;
--success-500: #22c55e;
--warning-500: #f59e0b;
--danger-500: #ef4444;
--info-500: #6c86ff;
```

Regra: `--brand-500` é a única cor de marca (botões primários, links, foco); `--accent-soft` é o fundo de badges/eyebrows/estado ativo, nunca usado como texto. Cores semânticas (success/warning/danger/info) são independentes da marca e nunca usadas como accent decorativo.

## 3. Tipografia
- **Inter** para tudo — UI, landing, headlines. Não usar serif/display separado (decisão do Conceito 1: consistência acima de floreio).
- Fallback stack: `Inter, -apple-system, "Segoe UI", ui-sans-serif, system-ui, sans-serif`.
- Escala fixa: `xs/sm/base/lg/xl/2xl/3xl/4xl/5xl`.
- Pesos 400/500/600/700 por contexto.
- Números tabulares obrigatórios em tabelas com valores monetários (`font-variant-numeric: tabular-nums`).
- Fonte de UI deve ter fallback que renderize corretamente CJK (chinês simplificado e japonês) — usar `Noto Sans SC`/`Noto Sans JP` como fallback explícito para esses locales, já que Inter não cobre CJK.

## 4. Grid e espaçamento
- Múltiplos de 4px, nunca valor arbitrário.
- Landing: bento grids, respiro generoso.
- Telas de produto: sidebar fixa, padding consistente, tabelas densas.

## 5. Componentes base (shadcn/ui como fundação, customizar via tokens, não recriar)
- Button (primary/secondary/ghost/destructive, com loading state)
- Input/Select/Form (React Hook Form + Zod)
- Table (cabeçalho sticky, densidade compacta, ações via kebab)
- Card, Badge (cor sempre semântica)
- Dialog/Sheet
- Sidebar/Nav (já preparada para módulos futuros)
- Toast
- Charts (uma única lib para todo o sistema)
- Theme Toggle (claro/escuro, com persistência e fallback em `prefers-color-scheme`)
- Language Toggle (EN-US/ZH-CN/ES/JA, com persistência)
- Os dois toggles ficam sempre no mesmo local do header em toda tela do sistema, landing ou logada, nunca implementados de forma diferente entre módulos.

## 6. Internacionalização (i18n)
- 4 idiomas desde a Fase 1: en-US, zh-CN, es, ja.
- Toda string visível ao usuário (labels, mensagens de erro, nomes de status/roles/permissions) vem de chave de tradução, nunca hardcoded.
- Números, moeda e datas formatados via `Intl.NumberFormat`/`Intl.DateTimeFormat` de acordo com o locale ativo.

## 7. Motion
- Framer Motion com duração padronizada: 200–250ms, inclusive na landing (Conceito 1: sem parallax, sem motion exagerado — precisão, não espetáculo).
- Fade + slide sutil como padrão de entrada; nada de spring/bounce.
- Nunca animar entrada de linha em tabelas grandes.
- Respeitar `prefers-reduced-motion`.

## 7a. Ícones e ilustração
- **lucide-react** como única biblioteca de ícones, stroke 1.5px, sempre monocromático (herda `currentColor`, nunca cor fixa).
- Sem ilustração figurativa. Elementos visuais decorativos (landing, empty states) são diagramas técnicos abstratos — nós conectados, barras, grids — nunca blobs orgânicos ou personagens.

## 8. Processo obrigatório antes de código
1. 3 conceitos de branding com justificativa
2. Aprovação do usuário
3. Atualizar tokens desta skill
4. Wireframes
5. Mockups de alta fidelidade
6. Só então código

## 9. Checklist antes de aprovar qualquer tela nova
- [ ] Usa tokens definidos
- [ ] Reusa componente existente
- [ ] Funciona em dark/light
- [ ] Idioma correto via chave de tradução (nunca string hardcoded)
- [ ] Densidade adequada ao contexto
- [ ] Motion consistente
- [ ] Responsivo (ver 9a)

## 9a. Responsividade — obrigatório em toda tela, sem exceção
Todo o site (marketing, auth, onboarding, app autenticado) precisa funcionar bem em telas de celular, não só desktop. Isso não é opcional nem depende do usuário pedir de novo.
- Nunca usar `grid-cols-N` fixo (N > 1) sem breakpoint — sempre `grid-cols-1 sm:grid-cols-N` (mobile empilha, desktop usa colunas).
- Containers de formulário/card não devem ter `max-w` fixo pensado só para telas curtas (ex.: login) reaproveitado em telas com mais campos (ex.: onboarding) — cada tela define a própria largura máxima adequada ao conteúdo; wrappers compartilhados (como `AuthShell`) devem aceitar a largura como prop, não vir hardcoded.
- Testar mentalmente (ou via devtools) em ~375px de largura antes de considerar a tela pronta — nada pode cortar texto, overflow horizontal ou espremer inputs.
- Espaçamento/padding pode reduzir em telas pequenas (`p-6 sm:p-8` etc.) em vez de manter o mesmo valor de desktop.

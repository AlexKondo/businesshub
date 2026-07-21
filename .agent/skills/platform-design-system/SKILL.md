---
name: platform-design-system
description: Diretrizes obrigatórias de identidade visual e Design System para a plataforma (landing page, dashboard, portal do fornecedor e módulos futuros). Usar sempre que for gerar qualquer tela, componente, wireframe ou mockup, para manter consistência entre todos os módulos.
---

# Design System — diretrizes obrigatórias

> Tokens de cor/tipografia definitivos ficam EM ABERTO até a aprovação do conceito de branding (ver seção 8). Atualizar esta skill assim que o usuário escolher um dos 3 conceitos propostos.

## 1. Princípios
- Minimalista e premium (referências: Stripe, Linear, Vercel, Supabase, Notion, Raycast, Clerk).
- Paleta neutra dominante + 1 cor de marca + 1 accent.
- Glassmorphism só em elementos flutuantes pontuais, nunca em tabelas/formulários densos.
- Consistência total entre dark/light mode via tokens pareados.
- Densidade adaptável: landing espaçosa, telas de produto densas.

## 2. Tokens via CSS variables — nunca cor hex direta no componente
- Escala de neutros
- `--brand-500/600`
- `--accent-500`
- Semânticas: `--success/warning/danger/info-500`
- Superfícies: `--bg-canvas`, `--bg-surface`, `--bg-surface-raised`, `--border-subtle/default`
- **(pendente)** preencher com valores definitivos após aprovação do conceito de branding.

## 3. Tipografia
- Uma sans-serif neutra para UI (+ opcionalmente serif/display só em headlines de landing).
- Escala fixa: `xs/sm/base/lg/xl/2xl/3xl/4xl/5xl`.
- Pesos 400/500/600/700 por contexto.
- Números tabulares obrigatórios em tabelas com valores monetários.
- Fonte de UI deve ter fallback que renderize corretamente CJK (chinês simplificado e japonês).

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
- Framer Motion com duração padronizada: 150–250ms em produto, 300–500ms só na landing.
- Nunca animar entrada de linha em tabelas grandes.
- Respeitar `prefers-reduced-motion`.

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
- [ ] Responsivo

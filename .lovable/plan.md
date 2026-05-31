
# Refatoração da página `/apresentacao` — Apresentação Executiva NEXO

## 1. Princípios

- Não é landing, não vende, não converte. É **apresentação institucional** para sócios, equipe, gestores, parceiros, clientes selecionados e investidores.
- Tom: Apple Keynote / Stripe Docs / Linear / Arc. Calmo, denso, premium, técnico.
- **Screenshots reais existentes em `/public/screenshots/*.{png,webp}` são o ativo principal** — preservados, ampliados, valorizados.
- Zero CTAs de vendas/login na superfície. Único elemento de navegação ativo: scroll + timeline lateral.

## 2. Remoções

- Botão "Acessar Sistema" da `NavBar` e do `Hero`.
- CTA gradiente do `Footer` ("Entrar no Sistema").
- Toda linguagem de conversão ("Acessar", "Entrar", "Comece agora").
- Badge "Plataforma de gestão para móveis planejados" estilo pill comercial — substituído por marcação institucional (ex: `NEXO · APRESENTAÇÃO INSTITUCIONAL · v2026`).

## 3. Estrutura final da página

```text
┌─────────────────────────────────────────────────────────────┐
│ TopBar minimal (logo NEXO + label institucional, sem CTA)   │
├──────────┬──────────────────────────────────────────────────┤
│          │ HERO                                             │
│ Timeline │ VISÃO GERAL — fluxo operacional animado          │
│ lateral  │ CAPÍTULO 01 — Comercial                          │
│ fixa     │ CAPÍTULO 02 — Contratos                          │
│ (desk-   │ ...                                              │
│ top)     │ CAPÍTULO 11 — Analytics                          │
│          │ APP DO FUNCIONÁRIO                               │
│          │ ECOSSISTEMA NEXO (módulos ao redor do core)      │
│          │ ARQUITETURA DA PLATAFORMA                        │
│          │ ENCERRAMENTO INSTITUCIONAL                       │
└──────────┴──────────────────────────────────────────────────┘
```

## 4. Seções — detalhamento

### 4.1 TopBar (`NavBar.tsx` reescrita)
- Glass, altura 56px, sem links âncora longos.
- Esquerda: `LogoNexo`. Direita: texto pequeno `APRESENTAÇÃO INSTITUCIONAL` + ano.
- **Sem botão de login.**

### 4.2 Hero (`Hero.tsx` ajustada)
- Mantém grid + partículas + glow.
- Tipografia:
  - Eyebrow: `PLATAFORMA NEXO`
  - H1 gigante: `NEXO`
  - Sub: "A plataforma que conecta toda a operação de móveis planejados."
  - Parágrafo: "Do primeiro contato comercial ao pós-venda, todos os processos integrados em uma única plataforma."
- Faixa de 4 KPIs logo abaixo (não é card pesado, é linha com separadores verticais):
  `11 Módulos Integrados · 50+ Funcionalidades · Tempo Real · Multi-Loja`
- Substituir os 2 botões por **um único affordance de scroll**: seta animada (chevron down com bounce sutil) + texto `Explorar a plataforma`. Clique → `scrollIntoView` suave para `#visao-geral`.

### 4.3 Visão Geral — Fluxo Operacional (`FluxoOperacional.tsx` reescrita)
- 7 etapas: Comercial → Contratos → Técnico → Produção → Logística → Montagem → Pós-venda.
- Cada etapa: ícone + nome + 1 linha descritiva.
- Linha conectora SVG com `pathLength` animado via Framer Motion `whileInView`.
- Stagger: etapas aparecem progressivamente (delay 120ms cada).
- Em mobile: timeline vertical.

### 4.4 Timeline lateral fixa (novo `TimelineLateral.tsx`)
- Posição: `fixed left-6 top-1/2 -translate-y-1/2`, escondida abaixo de `lg`.
- Lista vertical de 11 módulos + âncoras (#cap-comercial, #cap-contratos, …, #cap-analytics).
- Estados visuais:
  - `✓` (cinza esverdeado) — seção já passada
  - `●` (azul/verde com glow) — seção atual
  - `○` (cinza fraco) — futura
- Implementação: `IntersectionObserver` em cada `<section id="cap-…">` atualiza um índice ativo no estado.
- Hover: revela rótulo expandido com transição.
- Clique: scroll suave até a seção.

### 4.5 Capítulos dos módulos (`ModuloSection.tsx` reescrita + `data.ts` ajustado)
Para cada um dos 11 módulos (comercial, contratos, técnico, produção, logística, montagem, pós-venda, compras, rh, equipe, analytics):

Layout vertical com screenshot dominante (não mais 50/50 lado a lado em todos):

```text
┌──────────────────────────────────────────────┐
│ CAPÍTULO 01            ──────────── 01 / 11 │
│                                              │
│ COMERCIAL                                    │
│ Gestão completa do processo comercial.       │
│                                              │
│ [4 chips de features curtas]                 │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │                                          │ │
│ │       SCREENSHOT GIGANTE (browser frame) │ │
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

- Número do capítulo grande, peso institucional.
- Screenshot ocupa ~90% do width do container (max-w-6xl), proporção real do print.
- Frame "browser" minimalista (3 dots + URL `nexo.app/<rota>`).
- Borda glass, sombra dupla (escura embaixo + glow colorido do módulo embaixo difuso).
- Hover: scale 1.01, glow intensifica, ícone `Maximize2` aparece.
- Clique: abre `ImageZoomModalGaleria` (ver §4.6).
- Animação de entrada: blur reveal — `filter: blur(12px) → blur(0)` + opacity 0→1 + translateY 24→0, duração 700ms ease-out.

### 4.6 Modal de galeria (`ImageZoomModalGaleria.tsx`, substitui `ImageZoomModal`)
- Fullscreen `bg-[#0A0E1A]/98 backdrop-blur-2xl`.
- Setas ← → (teclado + on-screen) para navegar entre módulos.
- Barra inferior: nome do módulo + indicador `03 / 11` + botões `−` `+` `Reset` para zoom (CSS transform scale 1 → 3).
- Drag para pan quando zoom > 1.
- Fechar: Esc / X / clique no backdrop.

### 4.7 App do Funcionário (`AppFuncionarioShowcase.tsx` reescrita)
- Mantém mockup de smartphone (frame premium com bezels, notch, reflexo sutil).
- Screenshot real de `/portal-funcionario.webp` dentro do frame.
- Ao lado, 5 destaques com ícone + título + 1 linha:
  - Ponto por geolocalização
  - Solicitações RH
  - Comunicação interna
  - Metas
  - Aplicativo de campo
- Fundo: gradiente radial suave azul→transparente.

### 4.8 Ecossistema NEXO (novo `EcossistemaNexo.tsx`)
- Diagrama circular SVG: nó central "NEXO" (logo com glow), 11 nós orbitais (cada módulo com ícone).
- Linhas conectoras com gradiente azul→verde, animação de "pulso" leve (stroke-dashoffset).
- Em mobile: vira grid 3×4 de cards conectados visualmente por linhas verticais.
- Texto curto: "Onze módulos. Um único ecossistema."

### 4.9 Arquitetura da Plataforma (novo `ArquiteturaPlataforma.tsx`)
- Grid de 8 cards glass:
  - Frontend — React + TypeScript
  - Backend — Supabase (Postgres + Edge)
  - Tempo Real — sincronização em milissegundos
  - Multi-Loja — isolamento por `loja_id`
  - Controle de Permissões — RLS server-side
  - Segurança por Papéis — perfis e escopos
  - Escalabilidade — arquitetura horizontal
  - Responsividade — desktop, tablet, mobile
- Ícones lucide. Sem números de marketing.

### 4.10 Encerramento (`Footer.tsx` reescrita)
- Centralizado, tipografia grande:
  - Título: `Gestão que conecta.` / `Resultado que multiplica.` (gradient na segunda linha).
  - Parágrafo: "Uma plataforma construída para integrar pessoas, processos e informações em toda a operação de móveis planejados."
- **Sem botões. Sem CTA. Sem links.**
- Rodapé minúsculo: `© 2026 NEXO · Apresentação institucional`.

## 5. Design tokens (escopo da página)

Mantidos:
- `--nx-bg: #0A0E1A`
- `--nx-blue: #1A9BE8`
- `--nx-green: #22C97A`
- Glass: `bg-white/[0.04] backdrop-blur-xl border border-white/10`

Adicionados (CSS vars locais no wrapper da página):
- `--nx-ink-1: rgba(255,255,255,0.92)` (títulos)
- `--nx-ink-2: rgba(255,255,255,0.62)` (corpo)
- `--nx-ink-3: rgba(255,255,255,0.38)` (eyebrow/meta)
- `--nx-rule: rgba(255,255,255,0.08)` (réguas finas separadoras entre capítulos)

Réguas finas (1px, gradiente) entre capítulos para reforçar leitura tipo documento executivo.

## 6. Animações (Framer Motion, já no projeto)

- Entrada por seção: `whileInView` com `viewport={{ once: true, margin: "-15%" }}`.
- Variantes: `fade`, `slide-up`, `blur-reveal`, `stagger-children`.
- Hero: partículas canvas + grid (já existem, mantidos).
- Fluxo Operacional: `pathLength` animado.
- Ecossistema: `strokeDashoffset` em loop sutil (3s ease-in-out infinite).
- **Respeitar `prefers-reduced-motion`**: desliga partículas, blur reveal e loops.

## 7. Performance & técnico

- `<picture>` com `<source type="image/webp">` + fallback PNG (já existe, mantido).
- Todas as `<img>` com `loading="lazy"`, `decoding="async"`, `width`/`height` explícitos.
- `React.lazy` para `ImageZoomModalGaleria` (importa no primeiro clique).
- Sem novas dependências — usar apenas o que já existe (`framer-motion`, `lucide-react`, `react-helmet-async`).
- Manter Helmet com SEO básico já presente; atualizar `og:description` para tom institucional ("Apresentação institucional da plataforma NEXO.").
- Lighthouse alvo: ≥ 90 perf / 100 a11y / 100 best-practices.

## 8. Arquivos

**Criar:**
- `src/components/apresentacao/TimelineLateral.tsx`
- `src/components/apresentacao/EcossistemaNexo.tsx`
- `src/components/apresentacao/ArquiteturaPlataforma.tsx`
- `src/components/apresentacao/ImageZoomModalGaleria.tsx`
- `src/components/apresentacao/CapituloHeader.tsx` (cabeçalho `CAPÍTULO NN / 11` reutilizável)

**Reescrever:**
- `src/pages/Apresentacao.tsx` (nova ordem, timeline, sem CTA)
- `src/components/apresentacao/NavBar.tsx` (sem botão de login)
- `src/components/apresentacao/Hero.tsx` (sem CTAs, com seta de scroll + KPIs)
- `src/components/apresentacao/FluxoOperacional.tsx` (animação progressiva)
- `src/components/apresentacao/ModuloSection.tsx` (layout vertical, screenshot dominante, chapter header)
- `src/components/apresentacao/AppFuncionarioShowcase.tsx` (frame smartphone premium)
- `src/components/apresentacao/Footer.tsx` (encerramento institucional, sem CTA)

**Ajustar:**
- `src/components/apresentacao/data.ts` (garantir 11 módulos na ordem da timeline, com descrição em tom institucional)

**Remover:**
- `src/components/apresentacao/ImageZoomModal.tsx` (substituído pela galeria)
- `src/components/apresentacao/TecnologiaGrid.tsx` e `DiferenciaisGrid.tsx` (substituídos por `ArquiteturaPlataforma.tsx` e absorvidos no Ecossistema)

## 9. Fora do escopo

- Não tocar em tela de login, AppLayout, design system global do ERP.
- Não re-capturar screenshots — usar os PNG/WebP já existentes em `public/screenshots/`.
- Sem backend, sem migrations, sem auth.

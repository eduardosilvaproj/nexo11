
# Landing Page Premium NEXO — /apresentacao

## Visão geral
Reescrever `src/pages/Apresentacao.tsx` (rota pública já existente em `App.tsx`, fora do `AppLayout`) como uma landing institucional dark, futurista, com screenshots reais capturados via Playwright da conta demo.

## 1. Captura de screenshots (Playwright)

**Script:** `scripts/capture-screenshots.mjs` (executado localmente/manual, não em runtime).

- Instalar dev dep: `playwright` + browsers (`npx playwright install chromium`).
- Login em `https://nexo11.lovable.app/login` com `nexo@nexo.app` / `NexoDemo2025!`.
- Viewport 1440x900, `deviceScaleFactor: 2` (retina).
- Para cada módulo, navegar até a rota, aguardar `networkidle`, esperar 1.2s para animações, capturar `fullPage: false`.
- Salvar PNG em `/public/screenshots/{modulo}.png` e converter para WebP via `sharp` (`{modulo}.webp`, quality 85).
- Gerar também versões `@2x` para retina.

Rotas a capturar:
| Módulo | Rota |
|---|---|
| comercial | /comercial |
| contratos | /contratos |
| tecnico | /tecnico |
| producao | /producao |
| logistica | /logistica |
| montagem | /montagem |
| pos-venda | /pos-venda |
| comissoes | /comissoes |
| compras | /compras |
| rh | /rh |
| equipe | /equipe |
| analytics | /analytics |
| portal-funcionario | /portal-funcionario (viewport mobile 390x844) |

Comando: `node scripts/capture-screenshots.mjs`. Documentar no README a etapa manual.

## 2. Estrutura da página

Arquivo único: `src/pages/Apresentacao.tsx` + componentes auxiliares em `src/components/apresentacao/`.

```
Apresentacao.tsx
└─ components/apresentacao/
   ├─ NavBar.tsx              (glass, links âncora, CTA Entrar)
   ├─ Hero.tsx                (grid animado SVG + partículas canvas + glow)
   ├─ FluxoOperacional.tsx    (timeline horizontal animada com 7 etapas)
   ├─ KpisStrip.tsx           (4 KPIs em cards glass)
   ├─ ModuloSection.tsx       (template alternado img/texto, recebe props)
   ├─ AppFuncionarioShowcase.tsx (mockup smartphone + 3 screenshots empilhados)
   ├─ TecnologiaGrid.tsx      (badges das stacks)
   ├─ DiferenciaisGrid.tsx    (6 cards "Por que o NEXO?")
   ├─ Footer.tsx
   └─ ImageZoomModal.tsx      (Dialog shadcn p/ ampliar screenshot)
```

## 3. Identidade visual

- Background base `#0A0E1A`, com radial gradients sutis `#1A9BE8/10` e `#22C97A/10`.
- Tokens locais via CSS vars no escopo da página (não tocar no design system global):
  - `--nx-bg: #0A0E1A`
  - `--nx-blue: #1A9BE8`
  - `--nx-green: #22C97A`
- Glass: `bg-white/[0.04] backdrop-blur-xl border border-white/10`.
- Glow: `box-shadow: 0 0 80px -20px #1A9BE8`.
- Tipografia: manter Inter (já no projeto); pesos 600/700/800 para títulos, tracking apertado.
- Gradiente de texto NEXO: `linear-gradient(135deg,#1A9BE8 0%,#22C97A 100%)`.

## 4. Animações

- `framer-motion` (já disponível) para fade-in + slide-up no scroll com `whileInView`, stagger nos cards.
- Hero: SVG grid animado (linhas com `stroke-dasharray` animado) + canvas leve com ~40 partículas (60fps, `requestAnimationFrame`, pausável via `prefers-reduced-motion`).
- Fluxo operacional: linha conectora desenhada via SVG path com `pathLength` animado ao entrar na viewport.
- Hover screenshots: scale 1.02 + glow azul/verde.

## 5. Seções (ordem)

1. **NavBar fixa glass** — logo NEXO + âncoras (Visão, Módulos, App, Tecnologia, Diferenciais) + botão "Acessar Sistema" → `/login`.
2. **Hero** — logo grande com glow, H1, subtítulo, CTA primário (gradient azul→verde) + secundário "Ver módulos", grid + partículas atrás.
3. **Fluxo Operacional** — 7 chips conectados (Comercial → ... → Pós-venda) com animação sequencial.
4. **KPIs** — 4 cards glass: 11+ Módulos / 50+ Funcionalidades / Tempo Real / Multi-Loja.
5. **Módulos (12 seções alternadas)** — cada uma com ícone lucide, título, descrição, lista de 4 features com checks, screenshot real WebP clicável (abre modal). Layout alterna left/right.
6. **App do Funcionário** — frame de smartphone (SVG/CSS) com screenshot real do `/portal-funcionario`, ao lado lista de features.
7. **Tecnologia** — grid 7 badges (React, TypeScript, Supabase, Real Time, Multi Tenant, Segurança por Loja, Permissões por Papel) em cards glass com ícones.
8. **Diferenciais — "Por que o NEXO?"** — grid 6 cards com ícones gradient.
9. **CTA Final** — full-width, gradient sutil, botão grande "Entrar no Sistema".
10. **Footer** — logo + tagline "Gestão que conecta. Resultado que multiplica." + CTA.

## 6. Modal de zoom

`ImageZoomModal` usa `Dialog` shadcn, fundo `bg-black/90 backdrop-blur`, exibe imagem em até 95vw/90vh com cursor zoom; fechar com Esc/click fora.

## 7. Performance

- Todas as `<img>` com `loading="lazy"`, `decoding="async"`, `width`/`height` explícitos, `srcSet` `1x/2x`.
- Servir `.webp` (fallback `.png` via `<picture>`).
- `React.lazy` para `ImageZoomModal` (carrega no primeiro clique).
- `prefers-reduced-motion` desliga partículas e animações pesadas.
- Sem libs novas além de `playwright` (dev) e `sharp` (dev). `framer-motion` já existe.

## 8. SEO / Open Graph

- `react-helmet-async` já listado? Se não, adicionar e envolver app em `HelmetProvider` em `src/main.tsx`.
- `<Helmet>` em `Apresentacao.tsx`:
  - title: "NEXO — Gestão Inteligente para Móveis Planejados"
  - description, canonical `https://nexo11.lovable.app/apresentacao`
  - og:title, og:description, og:type=website, og:url, og:image=`/screenshots/comercial.webp`
  - twitter:card=summary_large_image
  - JSON-LD `SoftwareApplication`.
- Remover `<link rel="canonical">` do `index.html` se houver conflito.

## 9. Arquivos a criar/alterar

**Criar:**
- `scripts/capture-screenshots.mjs`
- `src/components/apresentacao/*` (10 arquivos)
- `public/screenshots/*.webp` (gerados pelo script)

**Alterar:**
- `src/pages/Apresentacao.tsx` (reescrever)
- `src/main.tsx` (envolver com `HelmetProvider` se ainda não estiver)
- `package.json` (devDeps: `playwright`, `sharp`, `react-helmet-async`)
- `index.html` (limpar canonical conflitante se necessário)

## 10. Riscos / observações

- **Captura não roda em runtime**: o script Playwright deve ser executado manualmente uma vez (e re-executado quando o sistema mudar visualmente). Vou documentar isso; sem isso as imagens em `/public/screenshots` não existem.
- A rota `/apresentacao` já está pública em `App.tsx` — confirmar antes de mexer.
- Não alterar tela de login nem logo do login.
- Tokens dark da landing ficam isolados na própria página (não impactam o restante do ERP que é claro).

# Refinamento premium da página /apresentacao

A estrutura atual já contempla Hero, Timeline lateral, 11 capítulos, Ecossistema, Arquitetura, Galeria de zoom e Encerramento. Este plano **eleva o nível visual** sem reconstruir nada e sem tocar nos screenshots já capturados.

---

## 1. Logo oficial como elemento de marca

Substituir o `<LogoNexo />` (texto NE-X-O) pelo PNG oficial `/nexo-logo.png` (já presente em `public/`) em **todos os pontos institucionais** da apresentação.

- Criar `src/components/apresentacao/LogoOficial.tsx`:
  - `<img src="/nexo-logo.png" alt="NEXO" />` com `loading="eager"` no hero/nav, `lazy` no footer/encerramento.
  - Props: `size` (`sm` 28px · `md` 40px · `lg` 96px · `xl` 160px · `2xl` 240px).
  - Glow premium via `filter: drop-shadow(0 0 48px rgba(0,170,255,0.55)) drop-shadow(0 0 96px rgba(18,183,106,0.3))`.
- Substituir uso em: `NavBar.tsx` (size `md`), `Hero.tsx` (size `2xl`), `EncerramentoInstitucional.tsx` (size `2xl`), `Footer.tsx` (size `lg`), `EcossistemaNexo.tsx` (núcleo central, size `lg`).
- Manter `LogoNexo.tsx` intacto (usado pelo /login e resto do app) — escopo apenas em /apresentacao.

## 2. Hero premium

- Logo oficial `2xl` (240px) com glow azul+verde triplo.
- Eyebrow: `PLATAFORMA NEXO` (tracking 0.4em, white/40).
- Título grande: `A plataforma que conecta toda a operação de móveis planejados.`
- Subtítulo: `Do primeiro contato comercial ao pós-venda, todos os processos integrados em uma única plataforma.`
- Linha de KPIs: `11 Módulos Integrados · 50+ Funcionalidades · Tempo Real · Multi-Loja`.
- Substituir botão por **scroll cue** animado: chevron + "Explorar Plataforma", scroll suave até `#visao-geral`.
- Fundo: manter grid + partículas canvas + dois blobs gradientes (azul `#00AAFF` / verde `#12B76A`) já existentes.
- Fade-in escalonado 500–700ms com `cubic-bezier(.16,1,.3,1)`; respeitar `prefers-reduced-motion`.

## 3. Remoção de resíduos comerciais

Auditoria final em `NavBar`, `Footer`, `Hero`, `AppFuncionarioShowcase`, `ArquiteturaPlataforma`:
- Remover qualquer "Acessar Sistema / Login / Entrar / Demo / Falar com".
- NavBar = logo + label "Apresentação Institucional · 2026". Sem links.
- Footer = logo oficial + copyright + frase institucional. Zero botões.

## 4. Capítulos (CAPÍTULO 01–12)

- Ajustar `MODULOS` em `data.ts` para incluir **Comissões** entre Pós-venda e Compras (atualmente 11 itens; pedido lista 12).
- Ordem final: Comercial → Contratos → Técnico → Produção → Logística → Montagem → Pós-venda → Comissões → Compras → RH → Equipe → Analytics.
- `CapituloHeader.tsx` já formata "Capítulo 01" — só refinar tracking e adicionar leve fade.
- Padronizar espaçamento `py-32` desktop / `py-20` mobile em `ModuloSection`.

## 5. Timeline lateral

- Estados visuais: `○` pendente · `●` ativo (gradiente do X) · `✓` concluído (verde `#12B76A`).
- Transição 300ms entre estados.
- Itens clicáveis com scroll suave para `#cap-<slug>`.
- Visível apenas em `xl:` (≥1280px), posição `left-6`.

## 6. Fluxo operacional

`FluxoOperacional.tsx`: 7 estágios (Comercial → Contratos → Técnico → Produção → Logística → Montagem → Pós-venda) em SVG horizontal/vertical responsivo, com linhas conectando e `pathLength` animado no scroll (Framer Motion `whileInView`).

## 7. Screenshots — protagonistas

- **Preservar 100% dos PNG/WebP em `public/screenshots/`.**
- `ModuloSection`: frame glass `bg-white/[0.03] border-white/10 backdrop-blur-xl`, sombra dupla (ambiente + accent do módulo), hover `scale-[1.008]` com overlay gradiente sutil.
- Barra superior estilo browser (3 dots + URL `nexo.app/<rota>`).
- `ImageZoomModalGaleria`: já permite zoom/pan/keyboard nav entre módulos — apenas confirmar fundo `#060d1a/98` e botões prev/next visíveis.

## 8. App do Funcionário

`AppFuncionarioShowcase.tsx`: mockup smartphone premium (notch, bezels finos, reflexo de tela) ao lado de lista de features:
- Ponto por geolocalização
- Solicitações RH
- Comunicação interna
- Metas individuais
- Modo campo offline

Cor de destaque: gradiente do X.

## 9. Ecossistema e Arquitetura

- `EcossistemaNexo`: núcleo central = **logo oficial PNG** (`lg`), 12 módulos ao redor em SVG circular, linhas com gradiente `#00AAFF → #12B76A` e dash animado.
- `ArquiteturaPlataforma`: 8 cards glass — Frontend (React + TS), Backend (Supabase), Tempo Real, Multi-Loja, Permissões por Papel, Segurança por Loja, Escalabilidade, Responsividade.

## 10. Encerramento institucional

`EncerramentoInstitucional.tsx`:
- Logo oficial `2xl` centralizado com glow forte.
- Título com gradient text: `Gestão que conecta.` / `Resultado que multiplica.`
- Parágrafo: `Uma plataforma construída para integrar pessoas, processos e informações em toda a operação de móveis planejados.`
- Zero botões.

## 11. Tokens, animações, performance

- Cor base unificada `#060d1a`, accents `#00AAFF` e `#12B76A`.
- Framer Motion `whileInView` + `once: true`, 400–700ms.
- `prefers-reduced-motion` respeitado em hero/fluxo/timeline.
- Logo PNG servido estaticamente, sem novos pacotes.

---

## Arquivos

**Criar**
- `src/components/apresentacao/LogoOficial.tsx`

**Editar**
- `src/components/apresentacao/NavBar.tsx`
- `src/components/apresentacao/Hero.tsx`
- `src/components/apresentacao/Footer.tsx`
- `src/components/apresentacao/EncerramentoInstitucional.tsx`
- `src/components/apresentacao/EcossistemaNexo.tsx`
- `src/components/apresentacao/CapituloHeader.tsx`
- `src/components/apresentacao/ModuloSection.tsx`
- `src/components/apresentacao/TimelineLateral.tsx`
- `src/components/apresentacao/FluxoOperacional.tsx`
- `src/components/apresentacao/AppFuncionarioShowcase.tsx`
- `src/components/apresentacao/ArquiteturaPlataforma.tsx`
- `src/components/apresentacao/data.ts` (adicionar capítulo Comissões na ordem)
- `src/pages/Apresentacao.tsx` (orquestração)

**Não tocar**
- `src/components/LogoNexo.tsx` (usado pelo /login e app)
- `public/screenshots/*`
- `scripts/capture-screenshots.mjs`
- Backend, autenticação, RLS, edge functions, outras rotas

---

## Resultado esperado

Apresentação executiva premium com:
- Logo oficial PNG forte e consistente como âncora de marca.
- Zero resíduo comercial.
- 12 capítulos numerados, screenshots reais em destaque máximo.
- Timeline lateral com progresso, fluxo operacional animado, ecossistema e arquitetura institucionais.
- Encerramento sóbrio com logo + frase. Sensação: maturidade, robustez, integração, escalabilidade.

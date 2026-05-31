
# Refatoração da página /apresentacao — Apresentação Executiva NEXO

Boa parte da estrutura já foi construída no ciclo anterior (Hero com partículas, Timeline lateral, 11 capítulos, Ecossistema, Arquitetura, Galeria de zoom). Este plano foca em **elevar o nível** — não recomeçar — corrigindo identidade visual, hierarquia, polimento e removendo qualquer resíduo comercial.

---

## 1. Identidade visual — alinhar 100% com /login

A página de login usa fundo `#060d1a`, ondas em canvas (`CanvasWaves`) e o `LogoNexo` em tamanho grande com glow azul-verde. Vamos espelhar essa linguagem.

- **Cor de fundo base**: trocar `#0A0E1A` por `#060d1a` (igual ao login) em `Apresentacao.tsx`, `NavBar`, `Footer`, modais e mockups.
- **Logo unificado**: garantir uso exclusivo de `<LogoNexo />` (mesmo componente do login). Remover qualquer texto "NEXO" hardcoded ao lado do logo. Criar variante `xl` no `LogoNexo` (≈ 96px) e `2xl` (≈ 160px) para Hero/Footer institucional.
- **Glow do logo**: usar exatamente o gradiente do "X" (`#00AAFF → #1E6FBF → #12B76A`) como fonte de cor para sombras e auras, substituindo os tons antigos `#1A9BE8 / #22C97A` onde fizer sentido (tokens CSS).
- **Background ambient**: reaproveitar `CanvasWaves` (do login) como camada de fundo opcional do Hero, em opacidade baixa (~0.35), por trás das partículas — reforça consistência visual com /login sem poluir.

## 2. Remover resíduos comerciais

Auditoria final para garantir tom institucional:

- Remover qualquer rastro de "Acessar Sistema", "Login", "Começar", "Falar com", "Demo" em `NavBar`, `Footer`, `Hero`, `AppFuncionarioShowcase` e `ArquiteturaPlataforma`.
- NavBar: apenas logo + label institucional ("Apresentação Institucional · 2026"). Sem links de navegação clicáveis para outras rotas do app.
- Footer: logo grande centralizado, frase institucional, copyright discreto. Zero botões.
- Substituir qualquer copy de marketing ("transforme", "potencialize", "aumente vendas") por linguagem descritiva-operacional.

## 3. Hero premium

- Logo central em tamanho `2xl` com `drop-shadow` triplo (azul + verde + branco suave) para criar a "aura premium".
- Acima do logo: eyebrow `PLATAFORMA NEXO` em tracking largo.
- Abaixo: título institucional + subtítulo (já existentes), revisar copy.
- KPIs (`11 Módulos · 50+ Funcionalidades · Tempo Real · Multi-Loja`) em linha divisora fina.
- Substituir botão por **indicador de scroll** animado (chevron + label "EXPLORAR PLATAFORMA"), apenas comportamento de scroll suave para `#visao-geral`.
- Animações: fade-in escalonado (logo → título → subtítulo → KPIs → scroll cue), duração 500-700ms, easing `cubic-bezier(.16,1,.3,1)`.

## 4. Estrutura de capítulos e fluxo

Já existe `CapituloHeader` e `ModuloSection`. Refinos:

- Padronizar espaçamento vertical entre capítulos para `py-32` (desktop) / `py-20` (mobile) para dar mais respiro.
- Reordenar capítulos para refletir o fluxo operacional real: Comercial → Contratos → Técnico → Produção → Logística → Montagem → Pós-venda → Compras → RH → Equipe → Analytics (ajustar `MODULOS` em `data.ts`).
- `FluxoOperacional`: revisar para exibir os 7 estágios do core operacional com setas/linhas animadas em SVG, com `pathLength` revelando no scroll.

## 5. Timeline lateral

Componente já criado. Ajustes:

- Estado visual: `○` pendente, `●` ativo (cor do gradiente X), `✓` concluído (verde).
- Reduzir largura, posicionar `left-6` em desktop ≥1280px, ocultar abaixo disso.
- Itens clicáveis com scroll suave para o capítulo correspondente.
- Animação de transição entre estados (300ms).

## 6. Screenshots — destaque máximo

`ModuloSection` e `ImageZoomModalGaleria` já estão bons. Polimento:

- Frame glass: aumentar `backdrop-blur`, borda `rgba(255,255,255,0.08)`, sombra dupla (ambiente + accent do módulo).
- Hover: `scale-[1.01]`, sombra cresce, overlay sutil com gradiente do módulo.
- Garantir `loading="lazy"` + `decoding="async"` (já presente).
- Modal: manter zoom/pan/keyboard nav, ajustar fundo para `#060d1a/98`.

## 7. App do Funcionário

Já existe seção. Refinar:

- Mockup smartphone premium (notch, bezels finos, reflexo de tela sutil).
- Lista de features ao lado: Ponto por geolocalização, Solicitações RH, Comunicação interna, Metas individuais, Modo campo offline.
- Cor de destaque alinhada ao gradiente do logo X.

## 8. Ecossistema e Arquitetura

Componentes já criados. Pequenos ajustes:

- `EcossistemaNexo`: núcleo central usa `<LogoNexo size="xl" />`, conexões com gradiente azul→verde do logo.
- `ArquiteturaPlataforma`: 8 cards glass — Frontend (React + TS), Backend (Supabase), Tempo Real, Multi-Loja, Segurança por Loja, Permissões por Papel, Escalabilidade, Responsividade. Ícones lucide, tipografia institucional.

## 9. Encerramento institucional

Nova seção final antes do Footer:

- Logo NEXO em tamanho `2xl` centralizado com glow.
- Título: "Gestão que conecta. Resultado que multiplica."
- Parágrafo: "Uma plataforma construída para integrar pessoas, processos e informações em toda a operação de móveis planejados."
- Zero botões. Apenas tipografia + glow.
- Footer logo abaixo, com logo do login + copyright.

## 10. Tokens, animações e performance

- CSS vars em `src/index.css` (escopadas em `.apresentacao-root`): `--nx-bg: #060d1a`, `--nx-ink-1/2/3`, `--nx-rule`, `--nx-accent-from: #00AAFF`, `--nx-accent-mid: #1E6FBF`, `--nx-accent-to: #12B76A`.
- Animações via Framer Motion `whileInView` + `once: true`, durações 400-700ms, respeitar `prefers-reduced-motion`.
- Manter lazy load do modal de galeria; nenhum pacote novo.

---

## Arquivos afetados

**Editar:**
- `src/components/LogoNexo.tsx` — adicionar tamanhos `xl` e `2xl`.
- `src/pages/Apresentacao.tsx` — cor de fundo `#060d1a`, ordem das seções, nova seção de encerramento institucional.
- `src/components/apresentacao/Hero.tsx` — logo gigante com glow, remoção de botão CTA-like, scroll cue.
- `src/components/apresentacao/NavBar.tsx` — limpar, fundo `#060d1a`.
- `src/components/apresentacao/Footer.tsx` — logo grande + frase institucional, sem CTAs.
- `src/components/apresentacao/FluxoOperacional.tsx` — 7 estágios com SVG animado.
- `src/components/apresentacao/TimelineLateral.tsx` — estados visuais ✓/●/○, clique para scroll.
- `src/components/apresentacao/ModuloSection.tsx` — polimento glass/sombra.
- `src/components/apresentacao/ImageZoomModalGaleria.tsx` — fundo `#060d1a`.
- `src/components/apresentacao/EcossistemaNexo.tsx` — núcleo com `LogoNexo xl`, cores do gradiente do logo.
- `src/components/apresentacao/ArquiteturaPlataforma.tsx` — confirmar 8 cards na ordem pedida.
- `src/components/apresentacao/AppFuncionarioShowcase.tsx` — mockup refinado.
- `src/components/apresentacao/data.ts` — ordem dos módulos no fluxo operacional.
- `src/index.css` — tokens `--nx-*` escopados.

**Criar:**
- `src/components/apresentacao/EncerramentoInstitucional.tsx` — seção final com logo + frase, sem CTA.

**Não tocar:** screenshots em `public/screenshots/`, scripts de captura, backend, autenticação, RLS, edge functions, qualquer outra rota.

---

## Resultado esperado

Página /apresentacao com:
- Mesma identidade visual de /login (fundo, logo, gradiente do X como cor de marca).
- Zero referência a vendas, login, CTAs comerciais.
- Hero com logo gigante e glow premium.
- 11 capítulos com screenshots em destaque máximo (frame glass + galeria fullscreen).
- Timeline lateral com progresso visual.
- Fluxo operacional animado, Ecossistema, Arquitetura e Encerramento institucional.
- Sensação geral: apresentação executiva navegável, calma, densa, tecnológica.

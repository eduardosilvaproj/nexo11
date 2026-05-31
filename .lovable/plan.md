# Refinamento Final da Hero NEXO

Ajustes pontuais. Sem mudança de identidade visual. Screenshots e timeline lateral **já existem** e serão mantidos como estão.

## 1. Logo (+~18%)

**Arquivo:** `src/components/apresentacao/LogoOficial.tsx`

- `size="hero"`: de `clamp(360px, 40vw, 560px)` para `clamp(425px, 47vw, 660px)` (~18%, dentro de 15–20%).
- Proporção e qualidade preservadas (`height: auto`).

## 2. Aurora Tecnológica (profundidade)

**Arquivo:** `src/components/apresentacao/Hero.tsx`

Substituir as duas camadas atrás do logo por uma **aurora** mais ampla e difusa, em baixa opacidade:

- **Camada 1 — halo branco sutil:** `radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 40%, transparent 70%)`, `blur(70px)`, `scale(1.6)`.
- **Camada 2 — aurora azul+verde:** gradiente elíptico horizontal misturando `rgba(26,155,232,0.16)` (esquerda) + `rgba(34,201,122,0.14)` (direita) + véu branco `rgba(255,255,255,0.05)` central, `blur(100px)`, `scale(2.0, 1.4)`. Forma alongada (aurora), não disco.

Ambas `aria-hidden`, `pointer-events-none`, `z-index: 0`. Logo permanece `z-index: 1`.

## 3. Animação de Respiração

**Arquivo:** `src/index.css` — keyframe `nx-logo-breathe`

- Curva: `scale(1) → scale(1.02) → scale(1)`.
- Duração: **8s**, `ease-in-out`, `infinite`.
- Aplicada em `.nx-logo-hero-outer`.
- Glow dinâmico (`nx-logo-glow`) **reduzido** ainda mais para não competir com a aurora: azul/verde `0.20/0.10`, branco `0.04`. Ciclo 10s mantido.

## 4. Screenshots — Preservar

`ModuloSection.tsx` e `ImageZoomModalGaleria.tsx` **já implementam**:

- Visualização fullscreen premium (modal)
- Zoom (botão "Ampliar")
- Navegação entre módulos (galeria)
- Animações suaves (fade/scale, `blur-reveal`)

Nada será alterado. Apenas confirmação de que tudo está ativo.

## 5. Timeline Lateral — Preservar

`TimelineLateral.tsx` **já existe** e é renderizada em `Apresentacao.tsx`:

- Fixa à esquerda, acompanha o scroll via `IntersectionObserver`
- Estados past / current / future
- Click → scroll suave para o módulo

Nenhuma mudança necessária.

## Arquivos tocados

- `src/components/apresentacao/LogoOficial.tsx`
- `src/components/apresentacao/Hero.tsx`
- `src/index.css`

## Resultado esperado

Logo ~18% maior, sobre uma aurora azul↔verde difusa e elegante que reforça profundidade sem aparência neon. Respiração lenta de 8s. Screenshots reais e timeline lateral seguem como principal narrativa visual — Hero passa a ter abertura de produto premium corporativo.
# Refinamento Premium do Logo NEXO — Hero

Ajustes finos, sem alterar a identidade visual. Foco em sofisticação, profundidade e presença.

## 1. Tamanho (+~20%)

**Arquivo:** `src/components/apresentacao/LogoOficial.tsx`

- Alterar `size="hero"` de `clamp(300px, 34vw, 460px)` para `clamp(360px, 40vw, 560px)` (~20% maior, dentro da faixa 15–25%).
- Manter proporção e qualidade originais (apenas `width`, `height: auto`).

## 2. Halo + Iluminação Radial (profundidade e suavização do PNG)

**Arquivo:** `src/components/apresentacao/Hero.tsx`

Ajustar as duas camadas já existentes atrás do logo para ficarem mais discretas e premium:

- **Camada 1 — halo branco difuso:** `radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 35%, transparent 65%)`, `blur(60px)`, `scale(1.5)`. Suaviza bordas do recorte PNG.
- **Camada 2 — iluminação radial azul+verde:** mistura discreta de `rgba(26,155,232,0.14)` + `rgba(34,201,122,0.12)` + `rgba(255,255,255,0.08)`, `blur(80px)`, `scale(1.7)`. Cria profundidade premium sem aparência neon.

Ambas `pointer-events-none`, `z-index: 0`. Logo permanece em `z-index: 1`.

## 3. Animação de Respiração (8s, ultra suave)

**Arquivo:** `src/index.css` — keyframe `nx-logo-breathe`

- Curva: `scale(1) → scale(1.02) → scale(1)`.
- Duração: **8s** (era 6s).
- Easing: `ease-in-out` para movimento orgânico.
- Aplicada em `.nx-logo-hero-outer`.

## 4. Glow Dinâmico Azul ↔ Verde (10s, baixa intensidade)

**Arquivo:** `src/index.css` — keyframe `nx-logo-glow`

- Ciclo: azul → verde → azul.
- Duração: **10s** (faixa 8–12s).
- Intensidades reduzidas para evitar neon/gamer:
  - Azul: `drop-shadow(0 0 28px rgba(26,155,232,0.28)) drop-shadow(0 0 64px rgba(26,155,232,0.14))`
  - Verde: `drop-shadow(0 0 28px rgba(34,201,122,0.28)) drop-shadow(0 0 64px rgba(34,201,122,0.14))`
  - Base branca constante: `drop-shadow(0 0 8px rgba(255,255,255,0.05))`
- Aplicada em `.nx-logo-hero-inner`.

## 5. Preservar

- Animação de entrada `nx-logo-enter` (1s fade + scale 0.92→1) — mantida.
- `prefers-reduced-motion` — mantido (desliga animações).
- Identidade visual, cores da marca, proporções do PNG — intactos.

## Arquivos tocados

- `src/components/apresentacao/LogoOficial.tsx`
- `src/components/apresentacao/Hero.tsx`
- `src/index.css`

## Resultado esperado

Logo ~20% maior, com halo radial suave que dissimula o recorte do PNG, respiração lenta de 8s e glow azul↔verde de 10s em baixa intensidade — presença visual dominante na Hero, com aparência corporativa premium, sem qualquer apelo gamer ou neon.

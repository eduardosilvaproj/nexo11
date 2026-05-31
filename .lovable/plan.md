# Ajuste fino do logo NEXO na Hero

## Mudanças

1. **Tamanho** — em `LogoOficial.tsx`, aumentar `size="hero"` de `clamp(240px, 28vw, 360px)` para `clamp(300px, 34vw, 460px)` (~28% maior, dentro da faixa 20–35%).

2. **Halo de suavização** — em `Hero.tsx`, envolver o logo num wrapper relativo contendo, atrás do `<img>`:
   - Camada 1: círculo `radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 65%)` com `blur(40px)`, escala 1.4× — derrete as bordas do PNG.
   - Camada 2: radial discreto misturando branco + `#1A9BE8` + `#22C97A` em opacidades baixas (0.12 / 0.10 / 0.10), `blur(60px)`, escala 1.6× — iluminação premium.
   - Ambas `pointer-events-none`, `z-index: 0`; logo em `z-index: 1`.

3. **Animação** — em `index.css`:
   - Reduzir `nx-logo-breathe` de scale 1.03 → **1.02**.
   - Reduzir intensidade das `drop-shadow` em `nx-logo-glow` (mais suave, menos saturado): manter alternância azul/verde mas com opacidades 0.35/0.20 (era 0.55/0.30).
   - Manter `nx-logo-enter` igual.

## Arquivos
- `src/components/apresentacao/LogoOficial.tsx`
- `src/components/apresentacao/Hero.tsx`
- `src/index.css`

Sem mexer em screenshots, dados, ou demais seções.

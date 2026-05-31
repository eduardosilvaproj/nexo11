# Logo da Hero — destaque premium + respiração

## Mudanças

1. **`LogoOficial.tsx`** — novo tamanho `hero` (≈ 360px desktop / 240px mobile via `clamp(240px, 28vw, 360px)`), preservando proporção.
2. **`Hero.tsx`** — trocar `size="2xl"` por `size="hero"`, aumentar margin-bottom (`mb-16`) entre logo e título, envolver em wrapper com classes de animação.
3. **`index.css`** — adicionar keyframes globais:
   - `logo-enter`: opacity 0 → 1 + scale 0.92 → 1, duração 1s, easing `cubic-bezier(.16,1,.3,1)`, executa uma vez.
   - `logo-breathe`: scale 1 → 1.03 → 1, duração 6s, `ease-in-out infinite`, inicia após `logo-enter`.
   - `logo-glow`: alterna intensidade do `filter: drop-shadow` entre azul `#1A9BE8` e verde `#22C97A`, duração 7s, infinito, suave.
   - Combinar via duas camadas: wrapper externo cuida de `breathe`, interno cuida de `glow` (para o `filter` não conflitar com `transform`).
   - Respeitar `prefers-reduced-motion`: desligar `breathe` e `glow`, manter apenas opacidade final.

## Arquivos

- editar `src/components/apresentacao/LogoOficial.tsx` (tamanho `hero`, deixar `glow="none"` quando solicitado para que o CSS controle)
- editar `src/components/apresentacao/Hero.tsx`
- editar `src/index.css`

Sem tocar em screenshots, dados, backend ou demais seções.

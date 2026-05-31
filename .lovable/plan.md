# Refino Premium do Logo da Hero

Objetivo: tornar o logo mais sofisticado, corporativo e integrado — removendo o efeito de energia percorrendo o símbolo e substituindo por sombra, profundidade e micro animações elegantes.

## 1. Remover efeitos chamativos

Em `src/components/apresentacao/Hero.tsx`:
- Remover a camada **Sweep de energia** (span com `nx-energy-sweep`, `mixBlendMode: overlay`, gradiente 115° e máscara radial).
- Remover a camada **Anel cônico** (`nx-ring-spin`, conic-gradient) — gira lentamente mas ainda adiciona movimento desnecessário.
- Manter apenas duas camadas de fundo: aurora base (azul/verde) e halo branco interno, ambas com opacidades reduzidas (ver §3).

Em `src/index.css`:
- Remover keyframes `nx-energy-sweep` e `nx-ring-spin` (e suas regras em `prefers-reduced-motion`).

## 2. Sombra premium + suavização de bordas

Em `src/components/apresentacao/LogoOficial.tsx` (variant `hero`):
- Aplicar no `<img>` do logo um `filter` combinando sombras suaves multicamadas (sem sombras duras):
  ```
  filter:
    drop-shadow(0 1px 1px rgba(0,0,0,0.18))
    drop-shadow(0 8px 24px rgba(0,0,0,0.28))
    drop-shadow(0 24px 60px rgba(8,18,32,0.45));
  ```
- Para suavizar bordas do PNG e reduzir percepção de recorte, somar um leve blur antes via SVG feather opcional; abordagem mais simples e estável: adicionar `drop-shadow(0 0 0.6px rgba(255,255,255,0.35))` como primeira camada (anti-alias percebido) e manter `image-rendering: auto`.
- Garantir `will-change: transform, filter` apenas no hero.

## 3. Glow discreto (cores da marca)

Em `Hero.tsx`, reduzir intensidade das duas camadas restantes:
- **Aurora base:** azul `rgba(26,155,232,0.10)` + verde `rgba(34,201,122,0.09)`, `blur(120px)`, `scale(2.0, 1.4)`, animação `nx-aurora-drift` mantida (14s) mas com amplitude reduzida.
- **Halo branco:** `rgba(255,255,255,0.06)` no centro → `rgba(255,255,255,0.02)` 40% → transparente 70%, `blur(70px)`, `scale(1.5)`, animação `nx-halo-breathe` mantida (10s) com opacidade entre 0.55 e 0.75.

Objetivo: o glow apenas separa o logo do fundo, não compete com ele.

## 4. Animação: respiração suave + flutuação opcional

Em `src/index.css`:
- Atualizar/criar `nx-logo-breathe`:
  ```
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-2px) scale(1.01); }
  ```
  Duração **10s**, `ease-in-out`, `infinite`.
- Remover/desativar `nx-logo-glow` (animação de cor pulsante azul↔verde no filtro do logo) — substituída por glow estático das camadas de fundo.
- Em `prefers-reduced-motion`: desativar `nx-logo-breathe`, `nx-aurora-drift`, `nx-halo-breathe`.

Em `LogoOficial.tsx`:
- Aplicar `animation: nx-logo-breathe 10s ease-in-out infinite` no wrapper do hero (não no `<img>` diretamente, para não conflitar com `filter`).

## 5. Tamanho

Manter `clamp(380px, 42vw, 580px)` — sem alteração.

## Arquivos alterados

- `src/components/apresentacao/Hero.tsx` — remover sweep e anel cônico; reduzir opacidades de aurora e halo.
- `src/components/apresentacao/LogoOficial.tsx` — aplicar drop-shadow multicamada no `<img>` hero; mover animação para o wrapper.
- `src/index.css` — remover `nx-energy-sweep`, `nx-ring-spin` e `nx-logo-glow`; ajustar `nx-logo-breathe` para 10s com flutuação de 2px e escala 1.01.

## Resultado esperado

Logo sem efeitos percorrendo o símbolo. Sombra profunda e suave dá presença corporativa. Glow discreto apenas separa do fundo. Respiração lenta com micro flutuação transmite vida sem distrair.

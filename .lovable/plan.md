## Objetivo
Transformar o logo da Hero em um elemento mais memorável e sofisticado, com aparência de tecnologia premium corporativa — sem aumentar tamanho, sem neon, sem efeitos gamer.

## Mudanças

### 1. `src/components/apresentacao/LogoOficial.tsx`
- Reduzir levemente o tamanho do hero para reequilibrar a composição:
  - De `clamp(425px, 47vw, 660px)` → `clamp(380px, 42vw, 580px)` (~-10%).
- Manter `glow="none"` (o brilho vem das camadas externas).

### 2. `src/components/apresentacao/Hero.tsx`
Substituir o stack atual de halo/aurora por **4 camadas** dentro de `.nx-logo-hero-outer`, todas `aria-hidden`, `pointer-events-none`, `z-index: 0`:

1. **Aurora base (azul → verde)** — elíptica ampla
   - `radial-gradient(ellipse at 30% 45%, rgba(26,155,232,0.18), transparent 55%), radial-gradient(ellipse at 70% 55%, rgba(34,201,122,0.16), transparent 55%)`
   - `filter: blur(110px)`, `transform: scale(2.1, 1.45)`
   - classe: `nx-aurora-drift` (deslocamento horizontal lentíssimo, 14s)

2. **Halo branco interno** — profundidade central
   - `radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 38%, transparent 68%)`
   - `filter: blur(60px)`, `transform: scale(1.5)`
   - classe: `nx-halo-breathe` (opacidade 0.7→1→0.7, 10s)

3. **Anel cônico sutil** — toque de iluminação dinâmica
   - `conic-gradient(from 0deg, rgba(26,155,232,0.10), rgba(34,201,122,0.10), rgba(26,155,232,0.10))`
   - `border-radius: 50%`, `filter: blur(40px)`, `transform: scale(1.3)`, `opacity: 0.6`
   - classe: `nx-ring-spin` (rotação contínua 30s, linear)

4. **Sweep de energia sobre o símbolo** — faixa diagonal translúcida
   - Aplicada com `mix-blend-mode: overlay` em um span **na frente** do logo (`z-index: 2`), com mask que limita ao bounding-box do símbolo.
   - `background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)`
   - `mask-image: radial-gradient(circle, #000 55%, transparent 75%)` para confinar ao símbolo central.
   - classe: `nx-energy-sweep` (translateX -120% → 120%, 9s, ease-in-out, infinite com longo delay entre passagens)

### 3. `src/index.css`
Manter `nx-logo-enter` e o wrapper, e **substituir/adicionar**:

- `nx-logo-breathe` (já existe) — manter 8s, scale 1→1.02→1.
- `nx-logo-glow` — reduzir ainda mais para ficar discreto:
  - blue: `0.16 / 0.08`, green: `0.16 / 0.08`, white: `0.03`. Duração 12s.
- **Novos keyframes**:
  - `@keyframes nx-aurora-drift` — `transform: scale(2.1,1.45) translateX(-2%)` → `translateX(2%)` → volta; 14s ease-in-out infinite.
  - `@keyframes nx-halo-breathe` — `opacity: 0.6 → 1 → 0.6`; 10s ease-in-out infinite.
  - `@keyframes nx-ring-spin` — `rotate(0) → rotate(360deg)`; 30s linear infinite.
  - `@keyframes nx-energy-sweep` — `transform: translateX(-120%)` → `translateX(120%)`; 9s ease-in-out infinite (passagem rápida mas com vento longo de invisibilidade percebida pela máscara).
- Respeitar `prefers-reduced-motion`: desligar todas as novas animações.

## Fora do escopo
- Tamanho não cresce (na verdade reduz levemente).
- Não tocar em screenshots, timeline lateral, partículas do canvas, KPIs ou tipografia.

## Resultado esperado
Logo com aurora azul/verde difusa derivando suavemente, halo respirando, anel cônico girando muito devagar e uma faixa discreta de energia atravessando o símbolo de tempos em tempos — visual corporativo, calmo, premium.

// Utilitários de feedback para o Recebimento (bipagem no celular).
// - beep(): tom curto via Web Audio API (funciona em qualquer browser moderno)
// - vibrate(): haptico em dispositivos que suportam (celular/tablet)
//
// Ambos são no-ops em ambiente sem suporte (desktop sem vibrate, audio context bloqueado).

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  try {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    audioCtx = new Ctor();
  } catch {
    return null;
  }
  return audioCtx;
}

/**
 * Toca um beep sintetico.
 * - kind: "ok" (1200Hz, 80ms) | "erro" (300Hz, 250ms) | "duplicado" (600Hz, 120ms)
 */
export function beep(kind: "ok" | "erro" | "duplicado" = "ok"): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  const freqs = { ok: [1200], erro: [300, 200], duplicado: [600] } as const;
  const durations = { ok: 0.08, erro: 0.25, duplicado: 0.12 } as const;
  const ts = ctx.currentTime;
  const f0 = freqs[kind][0];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(f0, ts);
  gain.gain.setValueAtTime(0, ts);
  gain.gain.linearRampToValueAtTime(0.25, ts + 0.01);
  gain.gain.linearRampToValueAtTime(0, ts + durations[kind]);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ts);
  osc.stop(ts + durations[kind] + 0.02);
  if (kind === "erro" && freqs.erro[1] != null) {
    // tom duplo pra erro
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freqs.erro[1], ts + 0.12);
    gain2.gain.setValueAtTime(0, ts + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, ts + 0.13);
    gain2.gain.linearRampToValueAtTime(0, ts + 0.25);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(ts + 0.12);
    osc2.stop(ts + 0.27);
  }
}

/**
 * Vibracao curta no celular. No-op se a API nao existir.
 * - kind: "ok" (50ms) | "erro" ([100, 50, 100]) | "duplicado" (30ms)
 */
export function vibrate(kind: "ok" | "erro" | "duplicado" = "ok"): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    if (kind === "erro") navigator.vibrate([100, 50, 100]);
    else if (kind === "duplicado") navigator.vibrate(30);
    else navigator.vibrate(50);
  } catch {
    // ignora
  }
}

/**
 * Mantem a tela do celular acordada enquanto o recebimento esta ativo.
 * Retorna funcao de cleanup para liberar o lock.
 */
export async function requestWakeLock(): Promise<() => void> {
  if (typeof navigator === "undefined") return () => {};
  const nav = navigator as Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
  };
  if (!nav.wakeLock) return () => {};
  try {
    const sentinel = await nav.wakeLock.request("screen");
    return () => {
      try { sentinel.release(); } catch { /* */ }
    };
  } catch {
    return () => {};
  }
}

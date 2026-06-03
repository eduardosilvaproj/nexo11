import { useEffect, useRef } from "react";
import { LogoOficial } from "./LogoOficial";
import { ChevronDown } from "lucide-react";

const KPIS = ["Inteligência Operacional", "Decisões em Tempo Real", "Visão Unificada", "Plataforma Premium"];

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const particles: { x: number; y: number; vx: number; vy: number; r: number; c: string }[] = [];

    function resize() {
      const parent = canvas!.parentElement!;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 48; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.4,
        c: Math.random() > 0.5 ? "#00AAFF" : "#2DD4BF",
      });
    }

    // linhas de conexão sutis entre partículas próximas
    function tick() {
      ctx!.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.hypot(dx, dy);
          if (d < 140) {
            ctx!.beginPath();
            ctx!.strokeStyle = "#7DD3FC";
            ctx!.globalAlpha = (1 - d / 140) * 0.12;
            ctx!.lineWidth = 0.6;
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(q.x, q.y);
            ctx!.stroke();
          }
        }
        ctx!.beginPath();
        ctx!.fillStyle = p.c;
        ctx!.globalAlpha = 0.5;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const scrollNext = () => {
    document.getElementById("problema")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-14 px-4 sm:px-6">
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,170,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.25) 1px, transparent 1px)",
          backgroundSize: "clamp(32px, 6vw, 64px) clamp(32px, 6vw, 64px)",
          maskImage: "radial-gradient(ellipse at center, #000 35%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 35%, transparent 75%)",
        }}
      />
      <div className="absolute top-1/3 left-1/4 w-[60vw] h-[60vw] max-w-[520px] max-h-[520px] rounded-full bg-[#00AAFF]/20 blur-[120px] sm:blur-[150px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[60vw] h-[60vw] max-w-[520px] max-h-[520px] rounded-full bg-[#2DD4BF]/20 blur-[120px] sm:blur-[150px] translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto text-center">
        <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-8 sm:mb-12 animate-fade-in">
          Inteligência Operacional
        </div>

        <div className="mb-10 sm:mb-16 flex items-center justify-center">
          <span className="nx-logo-hero-outer relative inline-flex items-center justify-center">
            <span
              aria-hidden
              className="nx-aurora-drift absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 45%, rgba(26,155,232,0.12), transparent 55%), radial-gradient(ellipse at 70% 55%, rgba(45,212,191,0.10), transparent 55%)",
                filter: "blur(120px)",
                zIndex: 0,
              }}
            />
            <span
              aria-hidden
              className="nx-halo-breathe absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, transparent 70%)",
                filter: "blur(70px)",
                transform: "scale(1.5)",
                zIndex: 0,
              }}
            />
            <span className="nx-logo-hero-inner relative" style={{ zIndex: 1 }}>
              <LogoOficial size="hero" glow="none" eager />
            </span>
          </span>
        </div>

        <h1 className="text-[clamp(1.75rem,5.5vw,3rem)] font-semibold tracking-tight text-white/95 leading-[1.1] mb-5 max-w-3xl mx-auto animate-fade-in">
          Mais do que dados.
          <br />
          <span className="bg-gradient-to-r from-[#7DD3FC] via-[#22D3EE] to-[#2DD4BF] bg-clip-text text-transparent">
            Inteligência para decidir.
          </span>
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-white/60 max-w-2xl mx-auto mb-10 sm:mb-14 animate-fade-in px-2 leading-relaxed">
          Empresas não crescem apenas por trabalhar mais. Crescem quando conseguem transformar experiência,
          processos e informações em decisões melhores. É exatamente para isso que o ARANDU foi criado.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 text-[11px] sm:text-xs md:text-sm text-white/60 mb-12 sm:mb-14 animate-fade-in">
          {KPIS.map((k, i) => (
            <div key={k} className="flex items-center gap-3 sm:gap-6">
              <span className="font-medium tracking-wide">{k}</span>
              {i < KPIS.length - 1 && <span className="text-white/15 hidden sm:inline">·</span>}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <button
            type="button"
            onClick={scrollNext}
            className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium text-white border border-white/15 bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-white/25 transition-all"
            style={{ boxShadow: "0 10px 40px -10px rgba(0,170,255,0.45), 0 0 0 1px rgba(45,212,191,0.10) inset" }}
          >
            <span>Explorar Plataforma</span>
            <span className="text-white/60 group-hover:translate-x-0.5 transition-transform">→</span>
          </button>

          <button
            type="button"
            onClick={scrollNext}
            className="group inline-flex flex-col items-center gap-1 text-white/40 hover:text-white/80 transition-colors"
          >
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef } from "react";
import { LogoOficial } from "./LogoOficial";
import { ChevronDown } from "lucide-react";

const KPIS = ["11 Módulos Integrados", "50+ Funcionalidades", "Tempo Real", "Multi-Loja"];

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

    for (let i = 0; i < 36; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.4,
        c: Math.random() > 0.5 ? "#00AAFF" : "#12B76A",
      });
    }

    function tick() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx!.beginPath();
        ctx!.fillStyle = p.c;
        ctx!.globalAlpha = 0.45;
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
    document.getElementById("visao-geral")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-14 px-4 sm:px-6">
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,170,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(18,183,106,0.25) 1px, transparent 1px)",
          backgroundSize: "clamp(32px, 6vw, 64px) clamp(32px, 6vw, 64px)",
          maskImage: "radial-gradient(ellipse at center, #000 35%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 35%, transparent 75%)",
        }}
      />
      <div className="absolute top-1/3 left-1/4 w-[60vw] h-[60vw] max-w-[520px] max-h-[520px] rounded-full bg-[#00AAFF]/20 blur-[120px] sm:blur-[150px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[60vw] h-[60vw] max-w-[520px] max-h-[520px] rounded-full bg-[#12B76A]/20 blur-[120px] sm:blur-[150px] translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto text-center">
        <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-8 sm:mb-12 animate-fade-in">
          Plataforma NEXO
        </div>

        <div className="mb-10 sm:mb-16 flex items-center justify-center">
          <span className="nx-logo-hero-outer relative inline-flex items-center justify-center">
            {/* Aurora base azul→verde — glow discreto que apenas separa do fundo */}
            <span
              aria-hidden
              className="nx-aurora-drift absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 45%, rgba(26,155,232,0.10), transparent 55%), radial-gradient(ellipse at 70% 55%, rgba(34,201,122,0.09), transparent 55%)",
                filter: "blur(120px)",
                zIndex: 0,
              }}
            />
            {/* Halo branco interno respirando */}
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

        <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-white/95 leading-[1.15] mb-5 max-w-3xl mx-auto animate-fade-in">
          A plataforma que conecta toda a operação de móveis planejados.
        </h1>
        <p className="text-base md:text-lg text-white/55 max-w-2xl mx-auto mb-14 animate-fade-in">
          Do primeiro contato comercial ao pós-venda, todos os processos integrados em uma única plataforma.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs md:text-sm text-white/60 mb-20 animate-fade-in">
          {KPIS.map((k, i) => (
            <div key={k} className="flex items-center gap-6">
              <span className="font-medium tracking-wide">{k}</span>
              {i < KPIS.length - 1 && <span className="text-white/15">·</span>}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={scrollNext}
          className="group inline-flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase">Explorar a Plataforma</span>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </button>
      </div>
    </section>
  );
}

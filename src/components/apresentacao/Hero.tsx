import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { LogoNexo } from "@/components/LogoNexo";
import { ArrowRight } from "lucide-react";

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
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
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 36;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.4,
        c: Math.random() > 0.5 ? "#1A9BE8" : "#22C97A",
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
        ctx!.globalAlpha = 0.55;
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

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(26,155,232,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(34,201,122,0.25) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, #000 35%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 35%, transparent 75%)",
        }}
      />
      {/* glows */}
      <div className="absolute top-1/3 left-1/4 w-[480px] h-[480px] rounded-full bg-[#1A9BE8]/20 blur-[140px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[480px] h-[480px] rounded-full bg-[#22C97A]/20 blur-[140px] translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white/70 bg-white/[0.04] border border-white/10 backdrop-blur-xl mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C97A] animate-pulse" />
          Plataforma de gestão para móveis planejados
        </div>

        <div className="mb-8 flex items-center justify-center text-white" style={{ filter: "drop-shadow(0 0 40px rgba(26,155,232,0.4))" }}>
          <div className="text-7xl md:text-8xl">
            <LogoNexo size="lg" />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.05] mb-6">
          Gestão Inteligente para{" "}
          <span className="bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] bg-clip-text text-transparent">
            Móveis Planejados
          </span>
        </h1>
        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
          Do comercial à pós-venda, tudo em um só lugar. Um ERP especializado, multi-loja, em tempo real.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/login"
            className="group inline-flex items-center justify-center gap-2 px-7 h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] shadow-[0_0_40px_-8px_#1A9BE8] hover:shadow-[0_0_60px_-4px_#22C97A] transition-shadow"
          >
            Acessar Sistema
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#modulos"
            className="inline-flex items-center justify-center px-7 h-12 rounded-xl font-semibold text-white bg-white/[0.04] border border-white/15 hover:bg-white/[0.08] backdrop-blur-xl transition-colors"
          >
            Ver módulos
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 text-xs tracking-widest uppercase animate-bounce">
        Scroll
      </div>
    </section>
  );
}

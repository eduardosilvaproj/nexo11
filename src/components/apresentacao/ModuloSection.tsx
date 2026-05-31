import { useState } from "react";
import { Check, Maximize2 } from "lucide-react";
import { Reveal } from "./Reveal";
import { ImageZoomModal } from "./ImageZoomModal";
import type { ModuloApresentacao } from "./data";

export function ModuloSection({ modulo, index }: { modulo: ModuloApresentacao; index: number }) {
  const [zoom, setZoom] = useState(false);
  const Icon = modulo.icon;
  const reverse = index % 2 === 1;
  const cor = modulo.cor === "blue" ? "#1A9BE8" : "#22C97A";
  const screenshot = `/screenshots/${modulo.slug}.webp`;
  const fallback = `/screenshots/${modulo.slug}.png`;

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
          <Reveal>
            <div>
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 bg-white/[0.04] border border-white/10 backdrop-blur-xl"
                style={{ boxShadow: `0 0 32px -8px ${cor}` }}
              >
                <Icon className="w-7 h-7" style={{ color: cor }} />
              </div>
              <div className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: cor }}>
                Módulo
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                {modulo.titulo}
              </h3>
              <p className="text-white/60 text-lg mb-8 leading-relaxed">{modulo.descricao}</p>
              <ul className="grid grid-cols-2 gap-3">
                {modulo.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-white/80 text-sm">
                    <Check className="w-4 h-4 shrink-0" style={{ color: cor }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <button
              type="button"
              onClick={() => setZoom(true)}
              className="group relative w-full rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 backdrop-blur-xl transition-all duration-300 hover:scale-[1.015] hover:border-white/20"
              style={{ boxShadow: `0 30px 80px -30px ${cor}66` }}
            >
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="ml-3 text-[10px] text-white/40 font-mono">nexo.app{modulo.rota}</span>
              </div>
              <picture>
                <source srcSet={screenshot} type="image/webp" />
                <img
                  src={fallback}
                  alt={`Tela do módulo ${modulo.titulo}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto block bg-[#0A0E1A]"
                  width={1440}
                  height={900}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </picture>
              <div className="absolute top-14 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1.5 text-xs text-white flex items-center gap-1.5">
                <Maximize2 className="w-3 h-3" /> Ampliar
              </div>
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `radial-gradient(circle at 50% 50%, ${cor}14, transparent 70%)` }}
              />
            </button>
          </Reveal>
        </div>
      </div>
      <ImageZoomModal open={zoom} onOpenChange={setZoom} src={screenshot} alt={modulo.titulo} />
    </section>
  );
}

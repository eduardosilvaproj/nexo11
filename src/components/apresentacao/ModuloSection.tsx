import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Reveal } from "./Reveal";
import { CapituloHeader } from "./CapituloHeader";
import type { ModuloApresentacao } from "./data";
import { MODULOS } from "./data";
import { ImageZoomModalGaleria } from "./ImageZoomModalGaleria";

export function ModuloSection({ modulo, index }: { modulo: ModuloApresentacao; index: number }) {
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);
  const Icon = modulo.icon;
  const cor = modulo.cor === "blue" ? "#1A9BE8" : "#22C97A";
  const screenshot = `/screenshots/${modulo.slug}.webp`;
  const fallback = `/screenshots/${modulo.slug}.png`;

  return (
    <section id={`cap-${modulo.slug}`} className="py-16 sm:py-24 px-4 sm:px-6 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <CapituloHeader numero={index + 1} total={MODULOS.length} />

          <div className="flex items-start gap-3 sm:gap-5 mb-6">
            <div
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center"
              style={{ boxShadow: `0 0 28px -10px ${cor}` }}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: cor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[clamp(1.5rem,5vw,3rem)] font-semibold text-white tracking-tight leading-[1.1]">
                {modulo.titulo}
              </h3>
              <p className="text-white/55 text-sm sm:text-base md:text-lg mt-3 max-w-2xl">
                {modulo.descricao}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-10">
            {modulo.features.map((f) => (
              <span
                key={f}
                className="text-[11px] px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-white/70 tracking-wide"
              >
                {f}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <button
            type="button"
            onClick={() => setZoomIdx(index)}
            className="group relative w-full rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 backdrop-blur-xl transition-all duration-500 hover:scale-[1.008] hover:border-white/20 blur-reveal"
            style={{
              boxShadow: `0 50px 120px -40px ${cor}55, 0 20px 50px -20px rgba(0,0,0,0.6)`,
            }}
          >
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="ml-3 text-[10px] text-white/40 font-mono">
                nexo.app{modulo.rota}
              </span>
            </div>
            <picture>
              <source srcSet={screenshot} type="image/webp" />
              <img
                src={fallback}
                alt={`Tela do módulo ${modulo.titulo}`}
                loading="lazy"
                decoding="async"
                width={1440}
                height={900}
                className="w-full h-auto block bg-[#060d1a]"
              />
            </picture>
            <div className="absolute top-14 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md rounded-lg px-2.5 py-1.5 text-xs text-white flex items-center gap-1.5">
              <Maximize2 className="w-3 h-3" /> Ampliar
            </div>
            <div
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: `radial-gradient(circle at 50% 50%, ${cor}14, transparent 70%)` }}
            />
          </button>
        </Reveal>
      </div>

      {zoomIdx !== null && (
        <ImageZoomModalGaleria
          startIndex={zoomIdx}
          onClose={() => setZoomIdx(null)}
        />
      )}
    </section>
  );
}

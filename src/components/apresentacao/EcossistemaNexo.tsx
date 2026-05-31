import { Reveal } from "./Reveal";
import { MODULOS } from "./data";
import { LogoNexo } from "@/components/LogoNexo";

export function EcossistemaNexo() {
  const total = MODULOS.length;
  const size = 560;
  const center = size / 2;
  const radius = 220;

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              Ecossistema NEXO
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Onze módulos. Um único ecossistema.
            </h2>
            <p className="text-white/55 mt-5 max-w-2xl mx-auto">
              Cada módulo opera de forma especializada, mas conversa em tempo real com todos os outros.
            </p>
          </div>
        </Reveal>

        <Reveal>
          {/* Desktop: diagrama circular */}
          <div className="hidden md:flex justify-center">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="absolute inset-0">
                <defs>
                  <linearGradient id="conn" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1A9BE8" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#22C97A" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                {MODULOS.map((_, i) => {
                  const a = (i / total) * Math.PI * 2 - Math.PI / 2;
                  const x = center + Math.cos(a) * radius;
                  const y = center + Math.sin(a) * radius;
                  return (
                    <line
                      key={i}
                      x1={center}
                      y1={center}
                      x2={x}
                      y2={y}
                      stroke="url(#conn)"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                      style={{ animation: `dash 6s linear ${i * 0.25}s infinite` }}
                    />
                  );
                })}
              </svg>

              {/* núcleo */}
              <div
                className="absolute flex items-center justify-center w-28 h-28 rounded-full bg-[#0A0E1A] border border-white/15 text-white"
                style={{
                  left: center - 56,
                  top: center - 56,
                  boxShadow: "0 0 80px -10px #1A9BE8, inset 0 0 40px rgba(34,201,122,0.2)",
                }}
              >
                <div className="text-2xl">
                  <LogoNexo size="lg" />
                </div>
              </div>

              {/* nós */}
              {MODULOS.map((m, i) => {
                const a = (i / total) * Math.PI * 2 - Math.PI / 2;
                const x = center + Math.cos(a) * radius;
                const y = center + Math.sin(a) * radius;
                const Icon = m.icon;
                const cor = m.cor === "blue" ? "#1A9BE8" : "#22C97A";
                return (
                  <div
                    key={m.slug}
                    className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: x, top: y }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl bg-[#0A0E1A] border border-white/10 flex items-center justify-center"
                      style={{ boxShadow: `0 0 24px -8px ${cor}` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: cor }} />
                    </div>
                    <span className="text-[10px] text-white/60 font-medium whitespace-nowrap">
                      {m.titulo}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile: grid */}
          <div className="md:hidden grid grid-cols-3 gap-3">
            {MODULOS.map((m) => {
              const Icon = m.icon;
              const cor = m.cor === "blue" ? "#1A9BE8" : "#22C97A";
              return (
                <div
                  key={m.slug}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/10"
                >
                  <Icon className="w-5 h-5" style={{ color: cor }} />
                  <span className="text-[10px] text-white/70 text-center">{m.titulo}</span>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -40; }
        }
        @media (prefers-reduced-motion: reduce) {
          line { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

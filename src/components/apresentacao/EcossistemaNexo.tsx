import { Reveal } from "./Reveal";
import { MODULOS } from "./data";
import { LogoOficial } from "./LogoOficial";

export function EcossistemaNexo() {
  const total = MODULOS.length;
  const size = 560;
  const center = size / 2;
  const radius = 220;

  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-12 sm:mb-16">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              Ecossistema NEXO
            </div>
            <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Doze módulos. Um único ecossistema.
            </h2>
            <p className="text-white/55 text-sm sm:text-base mt-4 sm:mt-5 max-w-2xl mx-auto">
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
                    <stop offset="0%" stopColor="#00AAFF" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.5" />
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
                className="absolute flex items-center justify-center w-36 h-36 rounded-full bg-[#060d1a] border border-white/15"
                style={{
                  left: center - 72,
                  top: center - 72,
                  boxShadow: "0 0 80px -10px #00AAFF, inset 0 0 40px rgba(45,212,191,0.25)",
                }}
              >
                <LogoOficial size="lg" glow="soft" />
              </div>

              {/* nós */}
              {MODULOS.map((m, i) => {
                const a = (i / total) * Math.PI * 2 - Math.PI / 2;
                const x = center + Math.cos(a) * radius;
                const y = center + Math.sin(a) * radius;
                const Icon = m.icon;
                const cor = m.cor === "blue" ? "#00AAFF" : "#2DD4BF";
                return (
                  <div
                    key={m.slug}
                    className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: x, top: y }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl bg-[#060d1a] border border-white/10 flex items-center justify-center"
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
              const cor = m.cor === "blue" ? "#00AAFF" : "#2DD4BF";
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

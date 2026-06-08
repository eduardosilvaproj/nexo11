import { Reveal } from "./Reveal";
import { LogoOficial } from "./LogoOficial";
import { Briefcase, Compass, Factory, Wrench, Wallet, HeadphonesIcon, Users, BarChart3 } from "lucide-react";

const NODES = [
  { titulo: "Comercial", icon: Briefcase, cor: "blue" as const },
  { titulo: "Projetos", icon: Compass, cor: "cyan" as const },
  { titulo: "Produção", icon: Factory, cor: "blue" as const },
  { titulo: "Montagem", icon: Wrench, cor: "cyan" as const },
  { titulo: "Financeiro", icon: Wallet, cor: "blue" as const },
  { titulo: "Atendimento", icon: HeadphonesIcon, cor: "cyan" as const },
  { titulo: "Equipe", icon: Users, cor: "blue" as const },
  { titulo: "Indicadores", icon: BarChart3, cor: "cyan" as const },
];

export function EcossistemaNexo() {
  const total = NODES.length;
  const size = 560;
  const center = size / 2;
  const radius = 220;

  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-12 sm:mb-16">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              Seção 03 · A Conexão
            </div>
            <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              O ponto onde tudo se conecta.
            </h2>
            <p className="text-white/55 text-sm sm:text-base mt-4 sm:mt-5 max-w-2xl mx-auto">
              Fluxo de informações convergindo para um único núcleo de inteligência.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="hidden md:flex justify-center">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="absolute inset-0">
                <defs>
                  <linearGradient id="conn" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1A9BE8" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#22C97A" stopOpacity="0.55" />
                  </linearGradient>
                </defs>
                {NODES.map((_, i) => {
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
                      style={{ animation: `dash 5s linear ${i * 0.25}s infinite` }}
                    />
                  );
                })}
              </svg>

              <div
                className="absolute flex items-center justify-center w-44 h-44 rounded-full bg-[#060d1a] border border-white/15"
                style={{
                  left: center - 88,
                  top: center - 88,
                  boxShadow: "0 0 90px -10px #1A9BE8, inset 0 0 40px rgba(34,201,122,0.25)",
                }}
              >
                <LogoOficial size="lg" glow="soft" className="!w-[140px]" />
              </div>

              {NODES.map((m, i) => {
                const a = (i / total) * Math.PI * 2 - Math.PI / 2;
                const x = center + Math.cos(a) * radius;
                const y = center + Math.sin(a) * radius;
                const Icon = m.icon;
                const cor = m.cor === "blue" ? "#1A9BE8" : "#22C97A";
                return (
                  <div
                    key={m.titulo}
                    className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: x, top: y }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl bg-[#060d1a] border border-white/10 flex items-center justify-center"
                      style={{ boxShadow: `0 0 24px -8px ${cor}` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: cor }} />
                    </div>
                    <span className="text-[10px] text-white/65 font-medium whitespace-nowrap">
                      {m.titulo}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="md:hidden">
            <div className="flex justify-center mb-6">
              <div
                className="flex items-center justify-center w-32 h-32 rounded-full bg-[#060d1a] border border-white/15"
                style={{ boxShadow: "0 0 60px -10px #1A9BE8, inset 0 0 30px rgba(34,201,122,0.25)" }}
              >
                <LogoOficial size="md" glow="soft" className="!w-[100px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {NODES.map((m) => {
                const Icon = m.icon;
                const cor = m.cor === "blue" ? "#1A9BE8" : "#22C97A";
                return (
                  <div
                    key={m.titulo}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10"
                  >
                    <Icon className="w-4 h-4" style={{ color: cor }} />
                    <span className="text-xs text-white/80">{m.titulo}</span>
                  </div>
                );
              })}
            </div>
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

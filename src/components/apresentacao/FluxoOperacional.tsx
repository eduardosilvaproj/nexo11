import { Reveal } from "./Reveal";

const ETAPAS = ["Comercial", "Contratos", "Técnico", "Produção", "Logística", "Montagem", "Pós-venda"];

const KPIS = [
  { v: "11+", l: "Módulos" },
  { v: "50+", l: "Funcionalidades" },
  { v: "Tempo Real", l: "Sincronização" },
  { v: "Multi-Loja", l: "Arquitetura" },
];

export function FluxoOperacional() {
  return (
    <section id="visao" className="relative py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <div className="text-xs font-semibold tracking-[0.3em] text-[#22C97A] uppercase mb-3">Visão Geral</div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Um fluxo único, da venda à entrega
            </h2>
            <p className="text-white/60 mt-4 max-w-2xl mx-auto">
              Todas as etapas operacionais conectadas em uma única plataforma, sem ilhas de informação.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="relative flex flex-wrap items-center justify-center gap-3 md:gap-2 mb-20">
            {ETAPAS.map((e, i) => (
              <div key={e} className="flex items-center gap-2 md:gap-3">
                <div
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-xl text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  style={{
                    animation: `fluxoPulse 4s ${i * 0.4}s ease-in-out infinite`,
                  }}
                >
                  <span className="bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] bg-clip-text text-transparent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="ml-2">{e}</span>
                </div>
                {i < ETAPAS.length - 1 && (
                  <div className="w-6 md:w-8 h-px bg-gradient-to-r from-[#1A9BE8]/40 to-[#22C97A]/40" />
                )}
              </div>
            ))}
          </div>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPIS.map((k, i) => (
            <Reveal key={k.l} delay={i * 80}>
              <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:border-[#1A9BE8]/40 transition-colors">
                <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] bg-clip-text text-transparent">
                  {k.v}
                </div>
                <div className="text-xs uppercase tracking-widest text-white/50 mt-2">{k.l}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fluxoPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(26,155,232,0); }
          50% { box-shadow: 0 0 24px -4px rgba(26,155,232,0.4); }
        }
      `}</style>
    </section>
  );
}

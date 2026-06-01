import { Reveal } from "./Reveal";
import { Briefcase, FileSignature, Ruler, Factory, Truck, Hammer, HeadphonesIcon } from "lucide-react";

const ETAPAS = [
  { nome: "Comercial", desc: "Captação e fechamento", icon: Briefcase },
  { nome: "Contratos", desc: "Formalização e XML", icon: FileSignature },
  { nome: "Técnico", desc: "Medição e conferência", icon: Ruler },
  { nome: "Produção", desc: "Fábrica e rastreio", icon: Factory },
  { nome: "Logística", desc: "Rotas e expedição", icon: Truck },
  { nome: "Montagem", desc: "Equipes e ocorrências", icon: Hammer },
  { nome: "Pós-venda", desc: "SLA, NPS e retenção", icon: HeadphonesIcon },
];

export function FluxoOperacional() {
  return (
    <section id="visao-geral" className="relative py-20 sm:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-12 sm:mb-20">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              Visão Geral
            </div>
            <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Um fluxo único, da venda à entrega
            </h2>
            <p className="text-white/55 text-sm sm:text-base mt-4 sm:mt-5 max-w-2xl mx-auto">
              Sete etapas operacionais conectadas. A informação percorre o sistema sem ilhas, sem retrabalho.
            </p>
          </div>
        </Reveal>

        <div className="relative">
          <div className="hidden md:block absolute top-7 left-[6%] right-[6%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 sm:gap-6 md:gap-3 relative">
            {ETAPAS.map((e, i) => (
              <Reveal key={e.nome} delay={i * 140}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-14 h-14 rounded-full bg-[#060d1a] border border-white/15 flex items-center justify-center mb-4 shadow-[0_0_30px_-8px_rgba(0,170,255,0.5)]">
                    <e.icon className="w-5 h-5 text-white/80" />
                    <span className="absolute -top-1 -right-1 text-[9px] font-mono tracking-tight px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white">{e.nome}</div>
                  <div className="text-[11px] text-white/45 mt-1">{e.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

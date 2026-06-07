import { Reveal } from "./Reveal";
import { Briefcase, Compass, Factory, Wrench, Wallet, HeadphonesIcon, BarChart3 } from "lucide-react";

const FONTES = [
  { nome: "Vendas", desc: "Funil, propostas, fechamentos", icon: Briefcase },
  { nome: "Projetos", desc: "Escopo, prazos, entregáveis", icon: Compass },
  { nome: "Produção", desc: "Fábrica, volumes, status", icon: Factory },
  { nome: "Montagem", desc: "Equipes, ocorrências, fotos", icon: Wrench },
  { nome: "Financeiro", desc: "Contas, fluxo, margens", icon: Wallet },
  { nome: "Atendimento", desc: "Chamados, SLA, satisfação", icon: HeadphonesIcon },
  { nome: "Indicadores", desc: "KPIs, metas, performance", icon: BarChart3 },
];

export function FluxoOperacional() {
  return (
    <section id="problema" className="relative py-20 sm:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-12 sm:mb-20">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              Seção 01 · O Problema
            </div>
            <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              O problema não é a falta de dados.
            </h2>
            <p className="text-white/55 text-sm sm:text-base mt-4 sm:mt-5 max-w-2xl mx-auto leading-relaxed">
              Hoje as empresas estão cercadas por informações. Mas informação não significa conhecimento.
              E conhecimento não significa decisão.
            </p>
          </div>
        </Reveal>

        <div className="relative">
          <div className="hidden md:block absolute top-7 left-[6%] right-[6%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 sm:gap-6 md:gap-3 relative">
            {FONTES.map((e, i) => (
              <Reveal key={e.nome} delay={i * 120}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-14 h-14 rounded-full bg-[#1B1F28] border border-white/15 flex items-center justify-center mb-4 shadow-[0_0_30px_-8px_rgba(26,155,232,0.5)]">
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

          <Reveal delay={900}>
            <p className="text-center text-white/40 text-xs sm:text-sm mt-12 italic">
              Todos gerando dados — em planilhas, WhatsApp, anotações e sistemas separados.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

import { Sparkles, Workflow, Store, Activity, Layers, TrendingUp } from "lucide-react";
import { Reveal } from "./Reveal";

const ITENS = [
  { icon: Sparkles, title: "Especializado em móveis planejados", desc: "Não é um ERP genérico adaptado — foi pensado para a operação do setor." },
  { icon: Workflow, title: "Operação ponta a ponta", desc: "Lead, contrato, medição, produção, entrega, montagem e pós-venda integrados." },
  { icon: Store, title: "Multi-loja", desc: "Arquitetura nativa multi-tenant para redes e franquias." },
  { icon: Activity, title: "Indicadores em tempo real", desc: "Dashboards atualizados sem precisar gerar relatório." },
  { icon: Layers, title: "Gestão operacional integrada", desc: "Sem planilhas paralelas, sem grupos de WhatsApp para coordenar." },
  { icon: TrendingUp, title: "Escalabilidade", desc: "Cresce com sua rede, do showroom único à operação nacional." },
];

export function DiferenciaisGrid() {
  return (
    <section id="diferenciais" className="py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <div className="text-xs font-semibold tracking-[0.3em] text-[#22C97A] uppercase mb-3">Diferenciais</div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Por que o NEXO?
            </h2>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ITENS.map((i, idx) => (
            <Reveal key={i.title} delay={idx * 70}>
              <div className="group p-7 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:border-[#1A9BE8]/40 transition-all h-full">
                <div className="w-12 h-12 mb-5 rounded-xl bg-gradient-to-br from-[#1A9BE8]/20 to-[#22C97A]/20 border border-white/10 flex items-center justify-center group-hover:shadow-[0_0_28px_-6px_#1A9BE8] transition-shadow">
                  <i.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{i.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{i.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Reveal } from "./Reveal";
import { TrendingUp, Eye, Route, Gauge, Brain, Database } from "lucide-react";

const CARDS = [
  { icon: TrendingUp, title: "Previsibilidade", desc: "Antecipe resultados, gargalos e oportunidades antes que aconteçam." },
  { icon: Eye, title: "Visibilidade", desc: "Enxergue toda a operação em tempo real, em um único lugar." },
  { icon: Route, title: "Rastreabilidade", desc: "Cada movimento, cada decisão, cada entrega — registrados ponta a ponta." },
  { icon: Gauge, title: "Produtividade", desc: "Menos retrabalho, menos ruído, mais foco no que gera valor." },
  { icon: Brain, title: "Tomada de Decisão", desc: "Informação na hora certa, no formato certo, para a pessoa certa." },
  { icon: Database, title: "Gestão por Dados", desc: "Decisões sustentadas por evidências, não por suposições." },
];

export function ArquiteturaPlataforma() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-10 sm:mb-16">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              Seção 05 · A Camada de Inteligência
            </div>
            <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              A inteligência por trás da operação.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={i * 70}>
              <div className="h-full p-7 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl hover:border-white/20 transition-colors group">
                <div
                  className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-5"
                  style={{ boxShadow: "0 0 28px -10px #00AAFF" }}
                >
                  <c.icon className="w-4 h-4 text-[#7DD3FC] group-hover:text-[#2DD4BF] transition-colors" />
                </div>
                <div className="text-white font-semibold mb-2 text-base">{c.title}</div>
                <div className="text-white/55 text-sm leading-relaxed">{c.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

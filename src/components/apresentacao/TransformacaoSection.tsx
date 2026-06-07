import { Reveal } from "./Reveal";
import { ArrowRight } from "lucide-react";

const PARES = [
  { de: "O comercial gera informações", para: "Previsibilidade de receita" },
  { de: "O projeto gera informações", para: "Visão de prazos e escopo" },
  { de: "A conferência gera informações", para: "Qualidade rastreável" },
  { de: "A montagem gera informações", para: "Produtividade real de campo" },
  { de: "O financeiro gera informações", para: "Margem e fluxo sob controle" },
];

export function TransformacaoSection() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-12 sm:mb-16">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              Seção 04 · A Tradução
            </div>
            <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Transformando informação em decisão.
            </h2>
            <p className="text-white/55 text-sm sm:text-base mt-4 sm:mt-5 max-w-2xl mx-auto">
              O NEXUS transforma tudo isso em conhecimento acionável.
            </p>
          </div>
        </Reveal>

        <div className="space-y-3">
          {PARES.map((p, i) => (
            <Reveal key={p.de} delay={i * 90}>
              <div className="group flex flex-col sm:flex-row items-center gap-3 sm:gap-6 p-5 sm:p-6 rounded-2xl bg-white/[0.025] border border-white/10 backdrop-blur-xl hover:border-white/20 transition-colors">
                <div className="flex-1 text-white/70 text-sm sm:text-base text-center sm:text-left">
                  {p.de}
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-[#22C97A] transition-colors shrink-0 rotate-90 sm:rotate-0" />
                <div className="flex-1 text-white font-medium text-sm sm:text-base text-center sm:text-right bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] bg-clip-text text-transparent">
                  {p.para}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

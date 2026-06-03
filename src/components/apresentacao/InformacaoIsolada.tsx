import { Reveal } from "./Reveal";
import { FileSpreadsheet, MessageSquare, StickyNote, ServerOff, RotateCw, AlertTriangle, EyeOff, Cloud } from "lucide-react";

const PROBLEMAS = [
  { icon: FileSpreadsheet, t: "Planilhas" },
  { icon: MessageSquare, t: "WhatsApp" },
  { icon: StickyNote, t: "Anotações" },
  { icon: ServerOff, t: "Sistemas separados" },
  { icon: RotateCw, t: "Retrabalho" },
  { icon: AlertTriangle, t: "Erros repetidos" },
  { icon: Cloud, t: "Falta de previsibilidade" },
  { icon: EyeOff, t: "Decisões no escuro" },
];

export function InformacaoIsolada() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-12 sm:mb-16">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              Seção 02 · O Custo Invisível
            </div>
            <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Informação isolada não gera resultado.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {PROBLEMAS.map((p, i) => (
            <Reveal key={p.t} delay={i * 70}>
              <div className="h-full p-5 rounded-2xl bg-white/[0.025] border border-white/10 backdrop-blur-xl hover:border-white/20 transition-colors flex flex-col items-center text-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                  <p.icon className="w-4 h-4 text-white/70" />
                </div>
                <div className="text-sm text-white/80 font-medium">{p.t}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

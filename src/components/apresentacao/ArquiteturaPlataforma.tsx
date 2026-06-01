import { Reveal } from "./Reveal";
import {
  Code2, Database, Zap, Building2, Shield, KeyRound, Network, Smartphone,
} from "lucide-react";

const CARDS = [
  { icon: Code2, title: "Frontend", desc: "React + TypeScript com Vite e Tailwind." },
  { icon: Database, title: "Backend", desc: "Supabase: Postgres, Auth, Storage e Edge Functions." },
  { icon: Zap, title: "Tempo Real", desc: "Sincronização entre dispositivos em milissegundos." },
  { icon: Building2, title: "Multi-Loja", desc: "Isolamento total de dados por unidade operacional." },
  { icon: Shield, title: "Controle de Permissões", desc: "RLS aplicado no servidor, sem brechas no cliente." },
  { icon: KeyRound, title: "Segurança por Papéis", desc: "Perfis, escopos e auditoria de ações sensíveis." },
  { icon: Network, title: "Escalabilidade", desc: "Arquitetura horizontal pronta para crescimento." },
  { icon: Smartphone, title: "Responsividade", desc: "Desktop, tablet e mobile com experiências dedicadas." },
];

export function ArquiteturaPlataforma() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-10 sm:mb-16">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              Arquitetura da Plataforma
            </div>
            <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Construída para escalar com a operação.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={i * 60}>
              <div className="h-full p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl hover:border-white/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-5">
                  <c.icon className="w-4 h-4 text-white/80" />
                </div>
                <div className="text-white font-semibold mb-1.5">{c.title}</div>
                <div className="text-white/50 text-sm leading-relaxed">{c.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

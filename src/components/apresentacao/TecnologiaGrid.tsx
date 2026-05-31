import { Code2, FileCode, Database, Zap, Building2, Shield, KeyRound } from "lucide-react";
import { Reveal } from "./Reveal";

const STACK = [
  { icon: Code2, name: "React", desc: "Interface moderna e reativa" },
  { icon: FileCode, name: "TypeScript", desc: "Tipagem forte de ponta a ponta" },
  { icon: Database, name: "Supabase", desc: "Banco Postgres gerenciado" },
  { icon: Zap, name: "Real Time", desc: "Sincronização instantânea" },
  { icon: Building2, name: "Multi Tenant", desc: "Isolamento por organização" },
  { icon: Shield, name: "Segurança por Loja", desc: "RLS no banco" },
  { icon: KeyRound, name: "Permissões por Papel", desc: "Controle granular" },
];

export function TecnologiaGrid() {
  return (
    <section id="tecnologia" className="py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <div className="text-xs font-semibold tracking-[0.3em] text-[#1A9BE8] uppercase mb-3">Tecnologia</div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Construído sobre uma base sólida
            </h2>
            <p className="text-white/60 mt-4 max-w-2xl mx-auto">
              Stack moderna, escalável e segura — pronta para redes com múltiplas lojas.
            </p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STACK.map((s, i) => (
            <Reveal key={s.name} delay={i * 60}>
              <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:border-[#22C97A]/40 transition-all hover:-translate-y-1 h-full">
                <s.icon className="w-7 h-7 mb-4 text-[#1A9BE8]" />
                <div className="text-white font-semibold mb-1">{s.name}</div>
                <div className="text-white/50 text-sm">{s.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

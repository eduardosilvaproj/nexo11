import { Reveal } from "./Reveal";
import { MapPin, MessageCircle, Target, Briefcase, Smartphone } from "lucide-react";

const FEATURES = [
  { icon: MapPin, title: "Ponto por geolocalização", desc: "Bater ponto valida posição em tempo real." },
  { icon: Briefcase, title: "Solicitações RH", desc: "Férias, atestados e benefícios pelo celular." },
  { icon: Target, title: "Metas", desc: "Acompanhamento de objetivos e gamificação." },
  { icon: MessageCircle, title: "Comunicação interna", desc: "Mural, comunicados e chat operacional." },
  { icon: Smartphone, title: "Aplicativo de campo", desc: "Medidores, montadores e técnicos com tarefas no bolso." },
];

export function AppFuncionarioShowcase() {
  return (
    <section id="app" className="relative py-28 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,201,122,0.08),transparent_60%)]" />
      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <div>
            <div className="text-xs font-semibold tracking-[0.3em] text-[#1A9BE8] uppercase mb-3">App do Funcionário</div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
              Toda a operação{" "}
              <span className="bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] bg-clip-text text-transparent">
                no bolso da equipe
              </span>
            </h2>
            <p className="text-white/60 text-lg mb-10">
              Um aplicativo dedicado para cada papel — vendedor, medidor, conferente, montador, entregador e admin.
            </p>
            <div className="space-y-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    <f.icon className="w-4 h-4 text-[#22C97A]" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{f.title}</div>
                    <div className="text-white/50 text-sm">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="flex justify-center">
            <div className="relative" style={{ filter: "drop-shadow(0 40px 80px rgba(26,155,232,0.3))" }}>
              {/* Phone frame */}
              <div className="relative w-[300px] h-[620px] rounded-[48px] bg-gradient-to-b from-[#1a1f2e] to-[#0a0e1a] border-[10px] border-[#0a0e1a] shadow-[inset_0_0_0_1.5px_#2a3142,0_0_60px_-10px_#1A9BE8]">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-10" />
                <div className="absolute inset-0 rounded-[36px] overflow-hidden bg-[#0A0E1A]">
                  <picture>
                    <source srcSet="/screenshots/portal-funcionario.webp" type="image/webp" />
                    <img
                      src="/screenshots/portal-funcionario.png"
                      alt="App do funcionário NEXO"
                      loading="lazy"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                  </picture>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

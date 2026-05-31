import { Reveal } from "./Reveal";
import { MapPin, MessageCircle, Target, Briefcase, Smartphone } from "lucide-react";

const FEATURES = [
  { icon: MapPin, title: "Ponto por geolocalização", desc: "Registro de jornada validado por posição em tempo real." },
  { icon: Briefcase, title: "Solicitações RH", desc: "Férias, atestados, benefícios e documentos pelo celular." },
  { icon: MessageCircle, title: "Comunicação interna", desc: "Mural, comunicados oficiais e chat operacional." },
  { icon: Target, title: "Metas", desc: "Objetivos, OKRs e acompanhamento individual." },
  { icon: Smartphone, title: "Aplicativo de campo", desc: "Medidores, montadores, entregadores e técnicos com tarefas no bolso." },
];

export function AppFuncionarioShowcase() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(26,155,232,0.08),transparent_65%)]" />
      <div className="relative max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-20">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              App do Funcionário
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Toda a operação no bolso da equipe
            </h2>
            <p className="text-white/55 mt-5 max-w-2xl mx-auto">
              Um aplicativo dedicado para cada papel — vendedor, medidor, conferente, montador, entregador e admin.
            </p>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <Reveal delay={120}>
            <div className="flex justify-center">
              <div className="relative" style={{ filter: "drop-shadow(0 50px 100px rgba(26,155,232,0.35))" }}>
                <div className="relative w-[300px] h-[620px] rounded-[48px] bg-gradient-to-b from-[#1a1f2e] to-[#0a0e1a] border-[10px] border-[#0a0e1a] shadow-[inset_0_0_0_1.5px_#2a3142,0_0_60px_-10px_#1A9BE8]">
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-10" />
                  <div className="absolute inset-0 rounded-[36px] overflow-hidden bg-[#0A0E1A]">
                    <picture>
                      <source srcSet="/screenshots/portal-funcionario.webp" type="image/webp" />
                      <img
                        src="/screenshots/portal-funcionario.png"
                        alt="App do funcionário NEXO"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-top"
                      />
                    </picture>
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.08]" />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <div className="space-y-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    <f.icon className="w-4 h-4 text-[#22C97A]" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{f.title}</div>
                    <div className="text-white/50 text-sm mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

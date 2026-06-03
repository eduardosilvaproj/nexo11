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
    <section className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,170,255,0.08),transparent_65%)]" />
      <div className="relative max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-12 sm:mb-20">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              App do Funcionário
            </div>
            <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Toda a operação no bolso da equipe
            </h2>
            <p className="text-white/55 text-sm sm:text-base mt-4 sm:mt-5 max-w-2xl mx-auto">
              Um aplicativo dedicado para cada papel — vendedor, medidor, conferente, montador, entregador e admin.
            </p>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 items-center">
          <Reveal delay={120}>
            <div className="flex justify-center">
              <div
                className="relative"
                style={{
                  filter: "drop-shadow(0 50px 100px rgba(0,170,255,0.35))",
                  width: "clamp(220px, 70vw, 300px)",
                }}
              >
                <div className="relative w-full aspect-[300/620] rounded-[12%] bg-gradient-to-b from-[#1a1f2e] to-[#060d1a] border-[8px] sm:border-[10px] border-[#060d1a] shadow-[inset_0_0_0_1.5px_#2a3142,0_0_60px_-10px_#00AAFF]">
                  <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 w-[30%] h-[3.5%] bg-black rounded-full z-10" />
                  <div className="absolute inset-0 rounded-[9%] overflow-hidden bg-[#060d1a]">
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
                    <f.icon className="w-4 h-4 text-[#2DD4BF]" />
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

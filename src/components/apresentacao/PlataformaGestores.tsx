import { Reveal } from "./Reveal";

export function PlataformaGestores() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,170,255,0.07),transparent_65%)]" />
      <div className="relative max-w-4xl mx-auto text-center">
        <Reveal>
          <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
            Seção 06 · Para Quem Decide
          </div>
          <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight leading-tight">
            Uma plataforma construída
            <br />
            <span className="bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] bg-clip-text text-transparent">
              para gestores.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={150}>
          <p className="text-white/60 text-base sm:text-lg mt-8 max-w-2xl mx-auto leading-relaxed">
            O objetivo não é gerar mais relatórios.
          </p>
          <p className="text-white/85 text-lg sm:text-xl mt-3 max-w-2xl mx-auto leading-relaxed">
            O objetivo é permitir decisões mais rápidas, mais seguras e mais lucrativas.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

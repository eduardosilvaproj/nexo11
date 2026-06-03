import { LogoOficial } from "./LogoOficial";
import { Reveal } from "./Reveal";

export function EncerramentoInstitucional() {
  return (
    <section className="relative py-24 sm:py-40 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] max-w-[700px] max-h-[700px] rounded-full bg-[#00AAFF]/10 blur-[120px] sm:blur-[180px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[500px] max-h-[500px] rounded-full bg-[#2DD4BF]/10 blur-[100px] sm:blur-[140px]" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <Reveal>
          <div className="flex items-center justify-center mb-8 sm:mb-12">
            <LogoOficial size="2xl" glow="premium" className="!w-[clamp(140px,40vw,240px)] h-auto" />
          </div>
        </Reveal>

        <Reveal delay={150}>
          <h2 className="text-[clamp(2rem,7vw,3.75rem)] font-semibold tracking-tight text-white leading-[1.05]">
            Gestão que conecta.
            <br />
            <span className="bg-gradient-to-r from-[#00AAFF] via-[#1E6FBF] to-[#2DD4BF] bg-clip-text text-transparent">
              Resultado que multiplica.
            </span>
          </h2>
        </Reveal>

        <Reveal delay={300}>
          <p className="text-white/55 text-base sm:text-lg md:text-xl mt-8 sm:mt-10 max-w-2xl mx-auto leading-relaxed">
            Uma plataforma construída para integrar pessoas, processos e informações em toda a
            operação de móveis planejados.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

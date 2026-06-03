import { LogoOficial } from "./LogoOficial";
import { Reveal } from "./Reveal";

export function EncerramentoInstitucional() {
  return (
    <section className="relative py-24 sm:py-40 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] max-w-[700px] max-h-[700px] rounded-full bg-[#00AAFF]/12 blur-[120px] sm:blur-[180px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[500px] max-h-[500px] rounded-full bg-[#2DD4BF]/12 blur-[100px] sm:blur-[140px]" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center">
        <Reveal>
          <div className="flex items-center justify-center mb-10 sm:mb-14">
            <LogoOficial size="2xl" glow="premium" className="!w-[clamp(160px,42vw,280px)] h-auto" />
          </div>
        </Reveal>

        <Reveal delay={150}>
          <h2 className="text-[clamp(2rem,7vw,3.75rem)] font-semibold tracking-tight text-white leading-[1.05]">
            Transformando informação
            <br />
            <span className="bg-gradient-to-r from-[#7DD3FC] via-[#22D3EE] to-[#2DD4BF] bg-clip-text text-transparent">
              em decisão.
            </span>
          </h2>
        </Reveal>

        <Reveal delay={300}>
          <div className="text-white/60 text-base sm:text-lg mt-10 max-w-2xl mx-auto leading-relaxed space-y-5">
            <p>
              Escolhemos o nome <span className="text-white">Arandu</span> porque ele representa exatamente o
              que acreditamos.
            </p>
            <p>
              Empresas não crescem apenas por trabalhar mais. Crescem quando conseguem transformar
              experiência, processos e dados em decisões melhores.
            </p>
            <p className="text-white/85">
              Arandu significa <em>sabedoria</em>. E é isso que queremos entregar.
            </p>
            <p>
              Uma plataforma capaz de organizar informações, conectar setores e gerar inteligência para que
              empresas tomem decisões mais rápidas, mais seguras e mais lucrativas.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

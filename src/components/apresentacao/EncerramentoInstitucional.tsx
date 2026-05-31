import { LogoNexo } from "@/components/LogoNexo";
import { Reveal } from "./Reveal";

export function EncerramentoInstitucional() {
  return (
    <section className="relative py-40 px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#00AAFF]/10 blur-[180px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#12B76A]/10 blur-[140px]" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <Reveal>
          <div
            className="flex items-center justify-center text-white mb-12"
            style={{
              filter:
                "drop-shadow(0 0 60px rgba(0,170,255,0.45)) drop-shadow(0 0 120px rgba(18,183,106,0.25))",
            }}
          >
            <LogoNexo size="2xl" />
          </div>
        </Reveal>

        <Reveal delay={150}>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
            Gestão que conecta.
            <br />
            <span className="bg-gradient-to-r from-[#00AAFF] via-[#1E6FBF] to-[#12B76A] bg-clip-text text-transparent">
              Resultado que multiplica.
            </span>
          </h2>
        </Reveal>

        <Reveal delay={300}>
          <p className="text-white/55 text-lg md:text-xl mt-10 max-w-2xl mx-auto leading-relaxed">
            Uma plataforma construída para integrar pessoas, processos e informações em toda a
            operação de móveis planejados.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

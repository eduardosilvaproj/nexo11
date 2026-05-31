import { Reveal } from "./Reveal";

export function Footer() {
  return (
    <footer className="relative py-32 px-6 border-t border-white/[0.06] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(26,155,232,0.1),transparent_65%)]" />
      <div className="relative max-w-4xl mx-auto text-center">
        <Reveal>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
            Gestão que conecta.
            <br />
            <span className="bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] bg-clip-text text-transparent">
              Resultado que multiplica.
            </span>
          </h2>
          <p className="text-white/55 text-lg md:text-xl mt-8 max-w-2xl mx-auto leading-relaxed">
            Uma plataforma construída para integrar pessoas, processos e informações em toda a
            operação de móveis planejados.
          </p>
        </Reveal>

        <div className="mt-24 pt-8 border-t border-white/[0.06] text-[10px] tracking-[0.3em] uppercase text-white/30">
          © {new Date().getFullYear()} NEXO · Apresentação Institucional
        </div>
      </div>
    </footer>
  );
}

import { LogoOficial } from "./LogoOficial";

export function Footer() {
  return (
    <footer className="relative py-12 sm:py-16 px-4 sm:px-6 border-t border-white/[0.06]">
      <div className="relative max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-center md:text-left">
        <div className="flex items-center gap-3">
          <LogoOficial size="lg" glow="soft" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/40">
            Plataforma
          </span>
        </div>
        <div className="text-[10px] tracking-[0.3em] uppercase text-white/30">
          © {new Date().getFullYear()} NEXO · Apresentação Institucional
        </div>
      </div>
    </footer>
  );
}

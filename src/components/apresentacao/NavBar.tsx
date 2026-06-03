import { LogoOficial } from "./LogoOficial";

export function NavBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#060d1a]/70 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <LogoOficial size="md" eager glow="soft" />
          <span className="hidden sm:inline text-[10px] tracking-[0.3em] uppercase text-white/40 truncate">
            Inteligência Operacional
          </span>
        </div>
        <div className="hidden sm:block text-[10px] tracking-[0.3em] uppercase text-white/40 truncate">
          ARANDU · usearandu.com.br
        </div>
      </div>
    </header>
  );
}

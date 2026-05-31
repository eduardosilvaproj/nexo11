import { LogoNexo } from "@/components/LogoNexo";

export function NavBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0A0E1A]/70 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="text-white flex items-center gap-3">
          <LogoNexo size="md" />
          <span className="hidden sm:inline text-[10px] tracking-[0.3em] uppercase text-white/40">
            Plataforma
          </span>
        </div>
        <div className="text-[10px] tracking-[0.3em] uppercase text-white/40">
          Apresentação Institucional · {new Date().getFullYear()}
        </div>
      </div>
    </header>
  );
}

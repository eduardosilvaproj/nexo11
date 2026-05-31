import { LogoNexo } from "@/components/LogoNexo";

export function Footer() {
  return (
    <footer className="relative py-16 px-6 border-t border-white/[0.06]">
      <div className="relative max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div
          className="text-white flex items-center gap-3"
          style={{ filter: "drop-shadow(0 0 24px rgba(0,170,255,0.35))" }}
        >
          <LogoNexo size="lg" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/40">
            Plataforma
          </span>
        </div>
        <div className="text-[10px] tracking-[0.3em] uppercase text-white/30 text-center">
          © {new Date().getFullYear()} NEXO · Apresentação Institucional
        </div>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import { LogoNexo } from "@/components/LogoNexo";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function Footer() {
  return (
    <footer className="relative py-24 px-6 border-t border-white/10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(26,155,232,0.12),transparent_60%)]" />
      <div className="relative max-w-4xl mx-auto text-center">
        <Reveal>
          <div className="text-white text-5xl md:text-6xl mb-6 flex items-center justify-center" style={{ filter: "drop-shadow(0 0 30px rgba(34,201,122,0.4))" }}>
            <LogoNexo size="lg" />
          </div>
          <p className="text-xl md:text-2xl text-white/80 font-medium mb-10">
            Gestão que conecta.{" "}
            <span className="bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] bg-clip-text text-transparent">
              Resultado que multiplica.
            </span>
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 h-14 rounded-xl font-semibold text-white bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] shadow-[0_0_50px_-8px_#1A9BE8] hover:shadow-[0_0_70px_-4px_#22C97A] transition-shadow text-base"
          >
            Entrar no Sistema
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>

        <div className="mt-20 pt-8 border-t border-white/5 text-xs text-white/40">
          © {new Date().getFullYear()} NEXO · Gestão para móveis planejados
        </div>
      </div>
    </footer>
  );
}

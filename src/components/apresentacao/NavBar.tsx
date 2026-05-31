import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogoNexo } from "@/components/LogoNexo";

const LINKS = [
  { href: "#visao", label: "Visão" },
  { href: "#modulos", label: "Módulos" },
  { href: "#app", label: "App" },
  { href: "#tecnologia", label: "Tecnologia" },
  { href: "#diferenciais", label: "Diferenciais" },
];

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0E1A]/80 backdrop-blur-xl border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/apresentacao" className="text-white">
          <LogoNexo size="lg" />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <Link
          to="/login"
          className="text-sm font-semibold px-4 py-2 rounded-lg text-white bg-gradient-to-r from-[#1A9BE8] to-[#22C97A] hover:shadow-[0_0_24px_-4px_#1A9BE8] transition-shadow"
        >
          Acessar Sistema
        </Link>
      </div>
    </header>
  );
}

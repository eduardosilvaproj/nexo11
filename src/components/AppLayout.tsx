import { Outlet, useLocation, Link, NavLink } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsBell } from "@/components/NotificationsBell";
import { PageTransition } from "@/components/ui/page-transition";
import {
  LayoutDashboard,
  FileText,
  Factory,
  Wrench,
  MoreHorizontal,
} from "lucide-react";
import { useState, useEffect } from "react";

const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  comercial: "Comercial",
  tecnico: "Técnico",
  producao: "Produção",
  logistica: "Logística",
  montagem: "Montagem",
  frota: "Frota",
  "pos-venda": "Pós-venda",
  dre: "DRE",
  mensagens: "Mensagens",
  financeiro: "Financeiro",
  comissoes: "Comissões",
  compras: "Compras",
  equipe: "Equipe",
  lojas: "Lojas",
  analytics: "Analytics",
  integracoes: "Integrações",
  contratos: "Contratos",
  rh: "RH",
};

const BOTTOM_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Contratos", icon: FileText, path: "/contratos" },
  { label: "Produção", icon: Factory, path: "/producao" },
  { label: "Montagem", icon: Wrench, path: "/montagem" },
];

function getInitials(nome?: string | null, email?: string | null) {
  const base = (nome || email || "").trim();
  if (!base) return "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function MobileBottomNav() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Detect keyboard open: viewport height significantly less than window height
      const isOpen = window.visualViewport
        ? window.visualViewport.height < window.innerHeight * 0.75
        : false;
      setIsKeyboardOpen(isOpen);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      return () => window.visualViewport?.removeEventListener("resize", handleResize);
    }
  }, []);

  if (isKeyboardOpen) return null;

  return (
    <>
      {/* Full menu overlay */}
      {showFullMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setShowFullMenu(false)}
        />
      )}
      {showFullMenu && (
        <div className="fixed bottom-[72px] left-3 right-3 z-50 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-xl md:hidden">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Menu completo
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(ROUTE_LABELS)
              .filter(([key]) => key !== "")
              .map(([key, label]) => (
                <NavLink
                  key={key}
                  to={`/${key}`}
                  onClick={() => setShowFullMenu(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 rounded-xl p-2 text-center text-[10px] font-medium transition-colors ${
                      isActive
                        ? "bg-sky-50 text-sky-600"
                        : "text-slate-500 hover:bg-slate-50"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/60 bg-white/80 pb-safe backdrop-blur-xl md:hidden">
        <div className="flex h-[68px] items-center justify-around px-2">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? "text-sky-600"
                    : "text-slate-400 hover:text-slate-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`h-5 w-5 transition-transform ${
                      isActive ? "scale-110" : ""
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute -top-0.5 h-0.5 w-5 rounded-full bg-sky-500" />
                  )}
                </>
              )}
            </NavLink>
          ))}
          {/* More button */}
          <button
            onClick={() => setShowFullMenu((v) => !v)}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors ${
              showFullMenu
                ? "text-sky-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { perfil, user } = useAuth();
  const segment = location.pathname.split("/").filter(Boolean)[0] ?? "";
  const segment2 = location.pathname.split("/").filter(Boolean)[1];
  let currentLabel = ROUTE_LABELS[segment] ?? "Dashboard";
  if (segment === 'contratos' && segment2) {
    const segment3 = location.pathname.split("/").filter(Boolean)[2];
    if (segment3 === 'medicao') currentLabel = "Medição Técnica";
    else if (segment3 === 'conferencia') currentLabel = "Conferência Técnica";
    else currentLabel = "Detalhes do Contrato";
  }
  const isDashboard = segment === "";
  const initials = getInitials(perfil?.nome, perfil?.email ?? user?.email ?? null);

  return (
    <SidebarProvider>
      <div className="nexus-app-shell flex min-h-screen w-full">
        <AppSidebar />
        <div className="relative z-[1] flex flex-1 flex-col">
          <header
            className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/70 bg-white/78 px-4 shadow-sm shadow-slate-900/[0.03] backdrop-blur-xl md:px-6"
          >
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="rounded-xl border border-slate-200 bg-white shadow-sm md:hidden" />
              <div className="md:hidden flex items-center ml-1">
                <img src="/nexus-logo.png" alt="NEXUS Planejados" className="h-20 w-auto object-contain" />
              </div>
              {/* Breadcrumb */}
              <nav className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-sm shadow-sm sm:flex">
              {isDashboard ? (
                <span className="font-semibold text-[#0D1117]">Dashboard</span>
              ) : (
                <>
                  <Link
                    to="/"
                    className="text-[#64748b] transition-colors hover:text-[#1a9be8]"
                  >
                    Dashboard
                  </Link>
                  <span className="text-[#64748b]/40">/</span>
                  <span className="font-semibold text-[#0D1117]">{currentLabel}</span>
                </>
              )}
              </nav>
              {/* Mobile Title */}
              <span className="text-sm font-semibold text-[#0D1117] sm:hidden">
                {currentLabel}
              </span>
            </div>

            {/* Right side: bell + avatar */}
            <div className="flex items-center gap-3">
              <NotificationsBell />
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(135deg,#1A9BE8,#22C97A)] text-xs font-bold text-white shadow-lg shadow-sky-900/15 ring-4 ring-slate-100"
                title={perfil?.nome ?? perfil?.email ?? ""}
              >
                {initials}
              </div>
            </div>
          </header>
          <main className="relative flex-1 overflow-x-hidden p-4 pb-20 md:p-6 md:pb-6">
            <div className="mx-auto w-full max-w-[1600px]">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </div>
          </main>
          {/* Mobile bottom navigation */}
          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}

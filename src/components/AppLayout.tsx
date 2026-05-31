import { Outlet, useLocation, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsBell } from "@/components/NotificationsBell";

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

function getInitials(nome?: string | null, email?: string | null) {
  const base = (nome || email || "").trim();
  if (!base) return "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
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
      <div className="nexo-app-shell flex min-h-screen w-full">
        <AppSidebar />
        <div className="relative z-[1] flex flex-1 flex-col">
          <header
            className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/70 bg-white/78 px-4 shadow-sm shadow-slate-900/[0.03] backdrop-blur-xl md:px-6"
          >
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="rounded-xl border border-slate-200 bg-white shadow-sm md:hidden" />
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
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(135deg,#1a7fe8,#22c97a)] text-xs font-bold text-white shadow-lg shadow-sky-900/15 ring-4 ring-slate-100"
                title={perfil?.nome ?? perfil?.email ?? ""}
              >
                {initials}
              </div>
            </div>
          </header>
          <main className="relative flex-1 overflow-x-hidden p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

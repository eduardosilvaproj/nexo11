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
  "pos-venda": "Pós-venda",
  dre: "DRE",
  mensagens: "Mensagens",
  financeiro: "Financeiro",
  comissoes: "Comissões",
  compras: "Compras",
  equipe: "Equipe",
  lojas: "Lojas",
  rh: "RH / Pessoas",
  analytics: "Analytics",
   integracoes: "Integrações",
  contratos: "Contratos",
  operacao: "Operação",
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
      <div className="flex min-h-screen w-full bg-slate-50">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="flex h-14 items-center justify-between bg-white/80 backdrop-blur-md px-4 md:px-6 border-b border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sticky top-0 z-30">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="md:hidden" />
              <nav className="hidden sm:flex items-center gap-2 text-sm">
              {isDashboard ? (
                <span className="font-semibold text-slate-900">Dashboard</span>
              ) : (
                <>
                  <Link to="/" className="text-slate-500 transition-colors hover:text-primary">
                    Dashboard
                  </Link>
                  <span className="text-slate-300">/</span>
                  <span className="font-semibold text-slate-900">{currentLabel}</span>
                </>
              )}
              </nav>
              <span className="sm:hidden font-semibold text-slate-900 text-sm">
                {currentLabel}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <NotificationsBell />
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm ring-2 ring-white"
                style={{ background: "linear-gradient(135deg, #1a7fe8, #22c97a)" }}
                title={perfil?.nome ?? perfil?.email ?? ""}
              >
                {initials}
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

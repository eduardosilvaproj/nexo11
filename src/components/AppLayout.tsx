import { Outlet, useLocation, Link } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
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
  financeiro: "Financeiro",
  comissoes: "Comissões",
  compras: "Compras",
  equipe: "Equipe",
  lojas: "Lojas",
  analytics: "Analytics",
  integracoes: "Integrações",
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
  const currentLabel = ROUTE_LABELS[segment] ?? "Dashboard";
  const isDashboard = segment === "";
  const initials = getInitials(perfil?.nome, perfil?.email ?? user?.email ?? null);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header
            className="flex h-14 items-center justify-between bg-white px-6 border-b border-slate-200"
          >
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm">
              {isDashboard ? (
                <span className="font-medium text-foreground">Dashboard</span>
              ) : (
                <>
                  <Link
                    to="/"
                    className="text-[#64748b] transition-colors hover:text-[#1a9be8]"
                  >
                    Dashboard
                  </Link>
                  <span className="text-[#64748b]/40">/</span>
                  <span className="font-medium text-foreground">{currentLabel}</span>
                </>
              )}
            </nav>

            {/* Right side: bell + avatar */}
            <div className="flex items-center gap-3">
              <NotificationsBell />
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: "#1a9be8" }}
                title={perfil?.nome ?? perfil?.email ?? ""}
              >
                {initials}
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

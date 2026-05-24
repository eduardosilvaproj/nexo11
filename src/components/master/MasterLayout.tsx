import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Store, Package, CreditCard, Activity,
  LifeBuoy, HeartPulse, ShieldCheck, LogOut, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/master", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/master/clientes", label: "Clientes", icon: Users },
  { to: "/master/lojas", label: "Lojas", icon: Store },
  { to: "/master/planos", label: "Planos", icon: Package },
  { to: "/master/assinaturas", label: "Assinaturas", icon: CreditCard },
  { to: "/master/limites", label: "Limites & Consumo", icon: Activity },
  { to: "/master/suporte", label: "Suporte", icon: LifeBuoy },
  { to: "/master/saude", label: "Saúde Operacional", icon: HeartPulse },
  { to: "/master/auditoria", label: "Auditoria", icon: ShieldCheck },
];

export default function MasterLayout() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Painel</div>
          <div className="text-lg font-semibold">Master SaaS</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t space-y-1">
          <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao app
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

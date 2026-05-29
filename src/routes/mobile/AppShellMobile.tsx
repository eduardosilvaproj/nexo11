import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Search, ChevronLeft, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNav } from "./BottomNav";
import {
  VENDEDOR_ROUTES,
  MEDIDOR_ROUTES,
  CONFERENTE_ROUTES,
  MONTADOR_ROUTES,
  ENTREGUE_ROUTES,
  ADMIN_ROUTES,
} from "./routes-config";
import type { MobileRole } from "./types";
import { useState } from "react";

const ROLE_LABELS: Record<MobileRole, string> = {
  vendedor: "Portal Vendedor",
  medidor: "Portal Medidor",
  conferente: "Portal Conferente",
  montador: "Portal Montador",
  entregue: "Portal Entregues",
  admin: "Portal Admin",
};

function getRoleRoutes(role: MobileRole) {
  switch (role) {
    case "vendedor": return VENDEDOR_ROUTES;
    case "medidor": return MEDIDOR_ROUTES;
    case "conferente": return CONFERENTE_ROUTES;
    case "montador": return MONTADOR_ROUTES;
    case "entregue": return ENTREGUE_ROUTES;
    case "admin": return ADMIN_ROUTES;
    default: return VENDEDOR_ROUTES;
  }
}

function getRoleFromPath(pathname: string): MobileRole {
  if (pathname.startsWith("/mobile/vendedor")) return "vendedor";
  if (pathname.startsWith("/mobile/medidor")) return "medidor";
  if (pathname.startsWith("/mobile/conferente")) return "conferente";
  if (pathname.startsWith("/mobile/montador")) return "montador";
  if (pathname.startsWith("/mobile/entregue")) return "entregue";
  if (pathname.startsWith("/mobile/admin")) return "admin";
  return "vendedor";
}

function getInitials(nome?: string | null) {
  if (!nome) return "?";
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const mobileIdx = segments.indexOf("mobile");
  if (mobileIdx === -1) return "App";
  const role = segments[mobileIdx + 1] ?? "";
  const sub = segments[mobileIdx + 2] ?? "";
  if (!sub) return ROLE_LABELS[getRoleFromPath(pathname) as MobileRole] ?? role;
  return sub.charAt(0).toUpperCase() + sub.slice(1);
}

export function AppShellMobile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { perfil, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const role: MobileRole = getRoleFromPath(location.pathname);
  const routes = getRoleRoutes(role);
  const pageTitle = getPageTitle(location.pathname);
  const initials = getInitials(perfil?.nome);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      {/* Top Header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-[56px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur-xl md:h-[60px]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 active:bg-slate-100 md:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white"
            style={{ minWidth: 32 }}
          >
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800 leading-tight">{pageTitle}</span>
            <span className="text-[11px] text-slate-400 leading-tight">{ROLE_LABELS[role]}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {/* search */}}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={() => {/* notifications */}}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 active:bg-slate-100 md:hidden"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 active:bg-red-50"
            title="Sair"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      {/* Profile dropdown menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-x-0 top-[56px] border-b border-slate-200 bg-white shadow-lg">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-800">{perfil?.nome ?? "Usuário"}</p>
                <p className="text-xs text-slate-400">{perfil?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 text-red-600 text-sm active:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 pt-[56px] pb-[68px] md:pt-[60px] md:pb-0 overflow-y-auto">
        <div className="mx-auto max-w-2xl">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        items={routes.map((r) => ({ path: r.path, label: r.label, icon: r.icon, badge: r.badge }))}
        role={role}
      />
    </div>
  );
}
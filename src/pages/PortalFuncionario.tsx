import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PortalInicio } from "@/components/portal/PortalInicio";
import { PortalPonto } from "@/components/portal/PortalPonto";
import { PortalSolicitacoes } from "@/components/portal/PortalSolicitacoes";
import { PortalCampo } from "@/components/portal/PortalCampo";
import { Home, Clock, FileText, MapPin, Bell } from "lucide-react";
import { Navigate } from "react-router-dom";

type Tab = "inicio" | "ponto" | "solicitacoes" | "campo";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "inicio", label: "Início", icon: Home },
  { key: "ponto", label: "Ponto", icon: Clock },
  { key: "solicitacoes", label: "Solicitações", icon: FileText },
  { key: "campo", label: "Campo", icon: MapPin },
];

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function PortalFuncionario() {
  const { user, perfil, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("inicio");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <div className="animate-pulse text-sm" style={{ color: "#6B7A90" }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const nome = perfil?.nome || user.email || "Funcionário";

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 py-3 bg-white/80 backdrop-blur-md"
        style={{ borderBottom: "0.5px solid #E8ECF2" }}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: "#1E6FBF" }}
            >
              {getInitials(nome)}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#0D1117" }}>
                Olá, {nome.split(" ")[0]}
              </p>
              <p className="text-[10px]" style={{ color: "#6B7A90" }}>
                Portal do Funcionário
              </p>
            </div>
          </div>
          <button
            className="relative w-10 h-10 flex items-center justify-center rounded-full"
            style={{ backgroundColor: "#F8F9FB" }}
          >
            <Bell className="h-5 w-5" style={{ color: "#6B7A90" }} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 max-w-lg mx-auto w-full">
        {activeTab === "inicio" && <PortalInicio />}
        {activeTab === "ponto" && <PortalPonto />}
        {activeTab === "solicitacoes" && <PortalSolicitacoes />}
        {activeTab === "campo" && <PortalCampo />}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md"
        style={{ borderTop: "0.5px solid #E8ECF2" }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto h-16">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] transition-colors"
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: isActive ? "#1E6FBF" : "#6B7A90" }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? "#1E6FBF" : "#6B7A90" }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Safe area for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}

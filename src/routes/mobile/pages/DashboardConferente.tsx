import { useAuth } from "@/contexts/AuthContext";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  Camera,
  ChevronRight,
} from "lucide-react";

export default function DashboardConferente() {
  const { perfil } = useAuth();

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const statCards = [
    {
      label: "Conferências Hoje",
      value: "4",
      icon: ClipboardCheck,
      color: "bg-blue-600",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      label: "Pendentes Revisão",
      value: "7",
      icon: Clock,
      color: "bg-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
    {
      label: "Concluídas Mês",
      value: "32",
      icon: CheckCircle2,
      color: "bg-emerald-500",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
  ];

  const emAndamento = [
    {
      id: 1,
      client: "Mercado Central Ltda",
      items: 24,
      status: "Em Conferência",
      statusColor: "bg-blue-100 text-blue-700",
    },
    {
      id: 2,
      client: "Distribuidora Oeste S.A.",
      items: 15,
      status: "Aguardando",
      statusColor: "bg-gray-100 text-gray-600",
    },
    {
      id: 3,
      client: "Atacado Norte ME",
      items: 8,
      status: "Para Aprovar",
      statusColor: "bg-amber-100 text-amber-700",
    },
  ];

  const quickActions = [
    { label: "Nova Conferência", icon: Plus, color: "bg-blue-600" },
    { label: "Verificar Itens", icon: Search, color: "bg-white border-2 border-blue-600" },
    { label: "Fotos", icon: Camera, color: "bg-white border-2 border-blue-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 capitalize">{today}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Bom dia, {perfil?.nome ?? "Conferente"}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Acompanhe suas conferências aqui.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center text-center"
          >
            <div className={`${card.bg} p-2.5 rounded-xl mb-3`}>
              <card.icon className={`w-5 h-5 ${card.text}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1 leading-tight">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Conferências em Andamento */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Conferências em Andamento
          </h2>
          <button className="text-xs text-blue-600 font-medium flex items-center gap-1">
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {emAndamento.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.client}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {item.items} itens para conferir
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${item.statusColor}`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl shadow-sm transition-transform active:scale-95"
              style={{
                backgroundColor:
                  action.color === "bg-blue-600" ? "#2563EB" : "#ffffff",
                color: action.color === "bg-blue-600" ? "#ffffff" : "#2563EB",
              }}
            >
              <action.icon className="w-5 h-5" />
              <span className="text-xs font-medium text-center leading-tight px-1">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

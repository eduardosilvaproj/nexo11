import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  ChevronRight,
  Plus,
  FileText,
  Flag,
  Phone,
} from "lucide-react";

export default function DashboardVendedor() {
  const { perfil } = useAuth();

  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = [
    {
      label: "Leads Hoje",
      value: "12",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      change: "+3",
    },
    {
      label: "Conversões Mês",
      value: "38",
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      change: "+5",
    },
    {
      label: "Meta Atingida",
      value: "67%",
      icon: Target,
      color: "text-orange-500",
      bg: "bg-orange-50",
      change: "+8%",
    },
    {
      label: "Comissões Pendentes",
      value: "R$ 4.250",
      icon: DollarSign,
      color: "text-purple-600",
      bg: "bg-purple-50",
      change: "",
    },
  ];

  const recentLeads = [
    {
      id: 1,
      name: "Marina Costa",
      source: "Google Ads",
      time: "há 15 min",
    },
    {
      id: 2,
      name: "Rafael Souza",
      source: "Indicação",
      time: "há 42 min",
    },
    {
      id: 3,
      name: "Camila Oliveira",
      source: "Instagram",
      time: "há 1h",
    },
    {
      id: 4,
      name: "Pedro Almeida",
      source: "Site",
      time: "há 2h",
    },
    {
      id: 5,
      name: "Juliana Santos",
      source: "Google Ads",
      time: "há 3h",
    },
  ];

  const actions = [
    {
      label: "Novo Lead",
      icon: Plus,
      color: "bg-blue-600",
      textColor: "text-white",
    },
    {
      label: "Ver Contratos",
      icon: FileText,
      color: "bg-white",
      textColor: "text-blue-600",
      border: "border border-blue-600",
    },
    {
      label: "Minhas Metas",
      icon: Flag,
      color: "bg-white",
      textColor: "text-blue-600",
      border: "border border-blue-600",
    },
  ];

  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-4 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">{greeting()}</p>
            <h1 className="text-white text-xl font-bold mt-1">
              {perfil?.nome || "Vendedor"}
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {perfil?.nome?.charAt(0) || "V"}
            </span>
          </div>
        </div>
        <p className="text-blue-100 text-xs mt-3 capitalize">{dateStr}</p>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-5 grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2"
          >
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div>
              <p className="text-gray-500 text-xs">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color} mt-0.5`}>
                {stat.value}
              </p>
            </div>
            {stat.change && (
              <span className="text-xs text-green-500 font-medium">
                {stat.change}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Leads Recentes */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gray-800 font-semibold text-base">Leads Recentes</h2>
          <button className="text-blue-600 text-sm font-medium flex items-center gap-1">
            Ver todos <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          {recentLeads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-800 text-sm font-medium">{lead.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{lead.source}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400">{lead.time}</span>
                  </div>
                </div>
              </div>
              <button className="p-2 rounded-xl bg-blue-50">
                <Phone className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="px-4 mt-6">
        <h2 className="text-gray-800 font-semibold text-base mb-3">Ações Rápidas</h2>
        <div className="flex gap-3">
          {actions.map((action, i) => (
            <button
              key={i}
              className={`flex-1 ${action.color} ${action.textColor} ${action.border || ""} rounded-2xl py-4 flex flex-col items-center gap-2 shadow-sm`}
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

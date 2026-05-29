import { useAuth } from "@/contexts/AuthContext";
import { CalendarDays, Camera, ChevronRight, ClipboardList, Clock, HardHat, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DashboardMontador() {
  const { perfil } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  const formattedDate = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const stats = [
    { label: "Ordens Hoje", value: 5, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Em Andamento", value: 2, icon: Wrench, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Concluídas Mês", value: 47, icon: HardHat, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const proximasOrdens = [
    { id: 1, client: "Carlos Eduardo Silva", address: "Rua das Acácias, 234 - Jd. Primavera", time: "08:00", status: "Agendada" },
    { id: 2, client: "Mariana Costa Oliveira", address: "Av. Brasil, 1500 - Centro", time: "11:30", status: "Agendada" },
    { id: 3, client: "Roberto Ferreira Souza", address: "Rua dos Ipês, 89 - Vila Nova", time: "14:00", status: "Agendada" },
  ];

  const quickActions = [
    { label: "Nova Ordem", icon: ClipboardList, color: "bg-blue-600", onClick: () => navigate("/mobile/ordens/nova") },
    { label: "Agenda", icon: CalendarDays, color: "bg-blue-500", onClick: () => navigate("/mobile/agenda") },
    { label: "Fotos", icon: Camera, color: "bg-blue-400", onClick: () => navigate("/mobile/fotos") },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-6">
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-6 pb-10 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm">Bem-vindo de volta</p>
            <h1 className="text-white text-2xl font-bold">{perfil.nome}</h1>
            <p className="text-blue-200 text-sm mt-1 capitalize">{formattedDate}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
            <HardHat className="text-white w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-6">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-6">
        <div className="flex gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`flex-1 ${action.color} rounded-2xl py-4 flex flex-col items-center gap-1 shadow-sm active:scale-95 transition-transform`}
            >
              <action.icon className="text-white w-6 h-6" />
              <span className="text-white text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Proximas Ordens */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Próximas Ordens</h2>
          <button onClick={() => navigate("/mobile/ordens")} className="text-blue-600 text-sm font-medium flex items-center gap-1">
            Ver todas <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {proximasOrdens.map((ordem) => (
            <div key={ordem.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {ordem.time}
                    </span>
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-lg">
                      {ordem.status}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{ordem.client}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{ordem.address}</p>
                </div>
                <ChevronRight className="text-gray-400 w-5 h-5 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
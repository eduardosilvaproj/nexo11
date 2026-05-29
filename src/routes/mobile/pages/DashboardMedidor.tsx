import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Timer,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DashboardMedidor() {
  const { perfil } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = [
    {
      label: "Medições Hoje",
      value: "3",
      icon: Timer,
      color: "bg-blue-600",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      label: "Em Andamento",
      value: "2",
      icon: Activity,
      color: "bg-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
    {
      label: "Concluídas Mês",
      value: "47",
      icon: CalendarDays,
      color: "bg-emerald-500",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
  ];

  const proximasMedicoes = [
    {
      id: "1",
      client: "Carlos Silva",
      address: "Rua das Flores, 123 - Jd. Primavera",
      time: "09:00",
      type: "Residencial",
    },
    {
      id: "2",
      client: "Maria Oliveira",
      address: "Av. Brasil, 456 - Centro",
      time: "11:30",
      type: "Comercial",
    },
    {
      id: "3",
      client: "João Pereira",
      address: "Rua do Sol, 789 - Vila Nova",
      time: "14:00",
      type: "Industrial",
    },
  ];

  const quickActions = [
    {
      label: "Nova Medição",
      icon: Plus,
      color: "bg-blue-600",
      action: () => navigate("/mobile/nova-medicao"),
    },
    {
      label: "Ver Agenda",
      icon: CalendarDays,
      color: "bg-violet-600",
      action: () => navigate("/mobile/agenda"),
    },
    {
      label: "Fotos",
      icon: Camera,
      color: "bg-teal-600",
      action: () => navigate("/mobile/fotos"),
    },
  ];

  return (
    <div className="px-4 py-3 flex flex-col gap-4">
      {/* Greeting */}
      <div className="flex flex-col gap-1">
        <p className="text-sm text-slate-500">Bom dia,</p>
        <h1 className="text-2xl font-bold text-slate-800">
          {perfil?.nome ?? "Medidor"}
        </h1>
        <p className="text-xs text-slate-400 capitalize">{dateStr}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-3 flex flex-col gap-2 shadow-sm border border-slate-100"
            >
              <div
                className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center`}
              >
                <Icon className={`w-4 h-4 ${stat.text}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-xs text-slate-500 leading-tight">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.action}
              className="flex-1 flex flex-col items-center gap-2 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div
                className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-700">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Próximas Medições */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Próximas Medições
          </h2>
          <button
            onClick={() => navigate("/mobile/agenda")}
            className="text-xs text-blue-600 font-medium flex items-center gap-1"
          >
            Ver todas
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {proximasMedicoes.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/mobile/medicao/${item.id}`)}
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {item.client}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <p className="text-xs text-slate-500 truncate">
                    {item.address}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-600">
                    {item.time}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">{item.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
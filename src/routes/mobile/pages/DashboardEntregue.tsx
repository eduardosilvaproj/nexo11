import { useAuth } from "@/contexts/AuthContext";
import { Truck, Package, ClipboardCheck, MapPin, Clock } from "lucide-react";

const mockEntregasHoje = [
  {
    id: 1,
    cliente: "Maria Silva",
    endereco: "Rua das Flores, 123 - Centro",
    hora: "08:00",
    status: "Em_andamento" as const,
  },
  {
    id: 2,
    cliente: "João Santos",
    endereco: "Av. Brasil, 456 - Jardim",
    hora: "09:30",
    status: "Pendente" as const,
  },
  {
    id: 3,
    cliente: "Ana Costa",
    endereco: "Rua Nova, 789 - Bairro Alto",
    hora: "11:00",
    status: "Pendente" as const,
  },
];

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  Em_andamento: {
    label: "Em Andamento",
    bg: "bg-blue-100",
    text: "text-blue-700",
  },
  Pendente: { label: "Pendente", bg: "bg-yellow-100", text: "text-yellow-700" },
  Concluida: { label: "Concluída", bg: "bg-green-100", text: "text-green-700" },
};

const hoje = new Date();
const dataFormatada = hoje.toLocaleDateString("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function DashboardEntregue() {
  const { perfil } = useAuth();

  return (
    <div className="px-4 py-3 pb-8 space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Olá, {perfil.nome.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 capitalize mt-0.5">{dataFormatada}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-600 rounded-2xl p-3 text-white">
          <div className="text-2xl font-bold">3</div>
          <div className="text-xs mt-1 opacity-90">Entregas Hoje</div>
        </div>
        <div className="bg-blue-500 rounded-2xl p-3 text-white">
          <div className="text-2xl font-bold">1</div>
          <div className="text-xs mt-1 opacity-90">Em Andamento</div>
        </div>
        <div className="bg-green-500 rounded-2xl p-3 text-white">
          <div className="text-2xl font-bold">12</div>
          <div className="text-xs mt-1 opacity-90">Concluídas</div>
        </div>
      </div>

      {/* Entregas de Hoje */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Entregas de Hoje
        </h2>
        <div className="space-y-3">
          {mockEntregasHoje.map((entrega) => {
            const st = statusConfig[entrega.status];
            return (
              <div
                key={entrega.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Truck size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entrega.cliente}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${st.bg} ${st.text}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <MapPin size={12} />
                    <span className="truncate">{entrega.endereco}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>{entrega.hora}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button className="bg-white rounded-2xl p-3 shadow-sm flex flex-col items-center gap-1.5">
          <div className="bg-blue-100 p-2.5 rounded-xl">
            <Truck size={20} className="text-blue-600" />
          </div>
          <span className="text-xs font-medium text-gray-700 text-center">
            Nova Entrega
          </span>
        </button>
        <button className="bg-white rounded-2xl p-3 shadow-sm flex flex-col items-center gap-1.5">
          <div className="bg-purple-100 p-2.5 rounded-xl">
            <ClipboardCheck size={20} className="text-purple-600" />
          </div>
          <span className="text-xs font-medium text-gray-700 text-center">
            Ver Romaneio
          </span>
        </button>
        <button className="bg-white rounded-2xl p-3 shadow-sm flex flex-col items-center gap-1.5">
          <div className="bg-green-100 p-2.5 rounded-xl">
            <Package size={20} className="text-green-600" />
          </div>
          <span className="text-xs font-medium text-gray-700 text-center">
            Agenda
          </span>
        </button>
      </div>
    </div>
  );
}

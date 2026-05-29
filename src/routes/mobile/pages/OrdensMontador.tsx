import { ChevronDown, ChevronUp, ClipboardList, MapPin, Search } from "lucide-react";
import { useState } from "react";

const mockOrdens = [
  { id: 1, client: "Carlos Eduardo Silva", address: "Rua das Acácias, 234 - Jd. Primavera", date: "2026-05-29", time: "08:00", status: "Agendada", items: 3 },
  { id: 2, client: "Mariana Costa Oliveira", address: "Av. Brasil, 1500 - Centro", date: "2026-05-29", time: "11:30", status: "Em Andamento", items: 5 },
  { id: 3, client: "Roberto Ferreira Souza", address: "Rua dos Ipês, 89 - Vila Nova", date: "2026-05-29", time: "14:00", status: "Agendada", items: 2 },
  { id: 4, client: "Ana Paula Rodrigues", address: "Rua das Palmeiras, 567 - Jd. Europa", date: "2026-05-30", time: "09:00", status: "Agendada", items: 4 },
  { id: 5, client: "Paulo Henrique Lima", address: "Av. das Nações, 890 - Centro", date: "2026-05-28", time: "08:00", status: "Concluída", items: 6 },
  { id: 6, client: "Fernanda Alves Costa", address: "Rua do Sol, 123 - Jd. Solar", date: "2026-05-27", time: "10:00", status: "Concluída", items: 3 },
  { id: 7, client: "Lucas Martins Pereira", address: "Rua das Rosas, 45 - Jd. das Flores", date: "2026-05-31", time: "08:30", status: "Agendada", items: 7 },
  { id: 8, client: "Juliana Santos Oliveira", address: "Av. Central, 200 - Centro", date: "2026-05-26", time: "14:00", status: "Concluída", items: 4 },
];

const statusColors: Record<string, string> = {
  Agendada: "bg-blue-100 text-blue-700",
  "Em Andamento": "bg-amber-100 text-amber-700",
  Concluída: "bg-emerald-100 text-emerald-700",
};

const filters = ["Hoje", "Esta Semana", "Pendentes", "Todas"];

export default function OrdensMontador() {
  const [activeFilter, setActiveFilter] = useState("Hoje");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredOrdens = mockOrdens.filter((ordem) => {
    if (activeFilter === "Hoje") {
      return ordem.date === "2026-05-29";
    }
    if (activeFilter === "Esta Semana") {
      return ["2026-05-29", "2026-05-30", "2026-05-31"].includes(ordem.date);
    }
    if (activeFilter === "Pendentes") {
      return ordem.status === "Agendada" || ordem.status === "Em Andamento";
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-100 pb-6">
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-6 pb-4 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Ordens de Serviço</h1>
        <p className="text-blue-200 text-sm mt-1">{filteredOrdens.length} ordens encontradas</p>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl flex items-center px-4 py-3 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Buscar por cliente ou endereço..."
            className="flex-1 text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 shadow-sm"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 space-y-3">
        {filteredOrdens.map((ordem) => (
          <div
            key={ordem.id}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === ordem.id ? null : ordem.id)}
              className="w-full px-4 py-4 text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${statusColors[ordem.status]}`}>
                      {ordem.status}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" /> {ordem.items} itens
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{ordem.client}</p>
                  <p className="text-sm text-gray-500 mt-1 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {ordem.address}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {ordem.date} às {ordem.time}
                  </p>
                </div>
                <div className="ml-2 mt-1">
                  {expandedId === ordem.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </button>

            {expandedId === ordem.id && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                <div className="space-y-2">
                  {Array.from({ length: ordem.items }, (_, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Item {i + 1}</span>
                      <span className="text-gray-400 text-xs px-2 py-0.5 bg-gray-100 rounded-lg">
                        {["Pendente", "Instalado", "Aguardando"][i % 3]}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="mt-3 w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl active:bg-blue-700 transition-colors">
                  Ver Detalhes
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
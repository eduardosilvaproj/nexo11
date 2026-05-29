import { AlertTriangle, CheckCircle, Package, Paperclip, Plus, Search, Truck } from "lucide-react";
import { useState } from "react";

interface Request {
  id: number;
  itemName: string;
  quantity: number;
  unit: string;
  status: "Pendente" | "Aprovado" | "Enviado";
  requestDate: string;
  urgency: "Urgente" | "Normal";
  notes?: string;
}

const mockRequests: Request[] = [
  { id: 1, itemName: "Tampo MDF 15mm 2.00x0.60", quantity: 3, unit: "un", status: "Enviado", requestDate: "2026-05-27", urgency: "Urgente" },
  { id: 2, itemName: "Puxador Alça 160mm Inox", quantity: 12, unit: "un", status: "Aprovado", requestDate: "2026-05-28", urgency: "Normal" },
  { id: 3, itemName: "Fita Edge Band 22mm Branca", quantity: 10, unit: "m", status: "Aprovado", requestDate: "2026-05-28", urgency: "Normal" },
  { id: 4, itemName: "Dobradiça 35mm c/ Amort.", quantity: 24, unit: "un", status: "Pendente", requestDate: "2026-05-29", urgency: "Urgente" },
  { id: 5, itemName: "Corrediça Telescópica 45cm", quantity: 8, unit: "un", status: "Pendente", requestDate: "2026-05-29", urgency: "Normal" },
  { id: 6, itemName: "Fundo MDF 6mm 2.75x1.83", quantity: 5, unit: "un", status: "Enviado", requestDate: "2026-05-26", urgency: "Normal" },
  { id: 7, itemName: "Pé Ajustável 100mm", quantity: 20, unit: "un", status: "Pendente", requestDate: "2026-05-29", urgency: "Urgente" },
  { id: 8, itemName: "Sapatão Plástico p/ Módulo", quantity: 15, unit: "un", status: "Aprovado", requestDate: "2026-05-27", urgency: "Normal" },
];

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  Pendente: { color: "bg-amber-100 text-amber-700", icon: Clock },
  Aprovado: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  Enviado: { color: "bg-emerald-100 text-emerald-700", icon: Truck },
};

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  );
}

const statusFilters = ["Todas", "Pendente", "Aprovado", "Enviado"];

export default function SolicitacoesMontador() {
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRequests = mockRequests.filter((req) => {
    const matchesStatus = statusFilter === "Todas" || req.status === statusFilter;
    const matchesSearch =
      req.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requestDate.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-6 pb-4 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Solicitações de Material</h1>
        <p className="text-blue-200 text-sm mt-1">{filteredRequests.length} solicitações</p>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl flex items-center px-4 py-3 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Buscar por material ou data..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Status Filters */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusFilters.map((filter) => {
            const config = filter === "Todas" ? null : statusConfig[filter];
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  statusFilter === filter
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 shadow-sm"
                }`}
              >
                {config && (
                  <span className={`w-2 h-2 rounded-full ${filter === "Pendente" ? "bg-amber-400" : filter === "Aprovado" ? "bg-blue-400" : "bg-emerald-400"}`} />
                )}
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Request List */}
      <div className="px-4 space-y-3">
        {filteredRequests.map((req) => {
          const config = statusConfig[req.status];
          const StatusIcon = config.icon;
          return (
            <div key={req.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 leading-tight">{req.itemName}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {req.quantity} {req.unit}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 ${config.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {req.status}
                  </span>
                  {req.urgency === "Urgente" && (
                    <span className="text-xs font-semibold text-red-600 flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      Urgente
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-2.5">
                <span className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  Solicitado em {formatDate(req.requestDate)}
                </span>
                <span className="font-medium">#{String(req.id).padStart(3, "0")}</span>
              </div>
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma solicitação encontrada</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
        <Plus className="text-white w-6 h-6" />
      </button>
    </div>
  );
}
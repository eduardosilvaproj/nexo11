import { ChevronDown, ChevronUp, MapPin, Package, Search } from "lucide-react";
import { useState } from "react";

const mockGuias = [
  {
    id: 1,
    numero: "GUI-2026-0041",
    client: "Carlos Eduardo Silva",
    address: "Rua das Acácias, 234 - Jd. Primavera",
    dueDate: "2026-05-29",
    priority: "Urgente",
    items: [
      { name: "Armário Alto 2 portas", qty: 1 },
      { name: "Prateleira regulável", qty: 4 },
      { name: "Puxador Alça", qty: 8 },
    ],
  },
  {
    id: 2,
    numero: "GUI-2026-0040",
    client: "Mariana Costa Oliveira",
    address: "Av. Brasil, 1500 - Centro",
    dueDate: "2026-05-29",
    priority: "Normal",
    items: [
      { name: "Painel para TV 55\"", qty: 1 },
      { name: "Suporte articulado", qty: 1 },
      { name: "Estante lateral", qty: 2 },
      { name: "Nichos decorativos", qty: 3 },
      { name: "Fita LED embutida", qty: 5 },
    ],
  },
  {
    id: 3,
    numero: "GUI-2026-0039",
    client: "Roberto Ferreira Souza",
    address: "Rua dos Ipês, 89 - Vila Nova",
    dueDate: "2026-05-30",
    priority: "Normal",
    items: [
      { name: "Mesa de Escritório", qty: 1 },
      { name: "Gaveteiro 3 drawers", qty: 1 },
      { name: "Acessório passacabo", qty: 2 },
    ],
  },
  {
    id: 4,
    numero: "GUI-2026-0038",
    client: "Ana Paula Rodrigues",
    address: "Rua das Palmeiras, 567 - Jd. Europa",
    dueDate: "2026-05-30",
    priority: "Urgente",
    items: [
      { name: "Guarda-roupa Casal", qty: 1 },
      { name: "Espelho Bisotado", qty: 1 },
      { name: "Cabideiro duplo", qty: 2 },
    ],
  },
  {
    id: 5,
    numero: "GUI-2026-0037",
    client: "Paulo Henrique Lima",
    address: "Av. das Nações, 890 - Centro",
    dueDate: "2026-05-28",
    priority: "Normal",
    items: [
      { name: "Cômoda 6 gavetas", qty: 1 },
      { name: "Pés sanfonados", qty: 4 },
    ],
  },
];

export default function GuiasMontador() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGuias = mockGuias.filter((guia) =>
    guia.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guia.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-6">
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-6 pb-4 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Guias de Entrega</h1>
        <p className="text-blue-200 text-sm mt-1">{mockGuias.length} guias pendentes</p>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl flex items-center px-4 py-3 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Buscar por número da guia ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Guides List */}
      <div className="px-4 space-y-3">
        {filteredGuias.map((guia) => (
          <div key={guia.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === guia.id ? null : guia.id)}
              className="w-full px-4 py-4 text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                  {guia.numero}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      guia.priority === "Urgente"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {guia.priority}
                  </span>
                  {expandedId === guia.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              <p className="font-semibold text-gray-900">{guia.client}</p>
              <p className="text-sm text-gray-500 mt-1 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {guia.address}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Vencimento: {formatDate(guia.dueDate)}
              </p>
            </button>

            {expandedId === guia.id && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Itens ({guia.items.length})</span>
                </div>
                <div className="space-y-2">
                  {guia.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-xl">
                      <span className="text-gray-700">{item.name}</span>
                      <span className="text-gray-400 text-xs font-medium bg-white px-2 py-0.5 rounded-lg">
                        x{item.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredGuias.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma guia encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
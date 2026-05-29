import { useState } from "react";
import {
  Search,
  Plus,
  Phone,
  MoreVertical,
  Filter,
  ChevronRight,
} from "lucide-react";

type TabKey = "Hoje" | "Esta Semana" | "Todas";
type Status = "Quente" | "Morno" | "Frio";

interface Lead {
  id: number;
  name: string;
  origin: string;
  phone: string;
  status: Status;
  time: string;
  email: string;
}

const mockLeads: Lead[] = [
  {
    id: 1,
    name: "Marina Costa",
    origin: "Google Ads",
    phone: "(11) 98765-4321",
    status: "Quente",
    time: "há 15 min",
    email: "marina.costa@email.com",
  },
  {
    id: 2,
    name: "Rafael Souza",
    origin: "Indicação",
    phone: "(21) 97654-3210",
    status: "Quente",
    time: "há 42 min",
    email: "rafael.souza@email.com",
  },
  {
    id: 3,
    name: "Camila Oliveira",
    origin: "Instagram",
    phone: "(31) 96543-2109",
    status: "Morno",
    time: "há 1h",
    email: "camila.oliveira@email.com",
  },
  {
    id: 4,
    name: "Pedro Almeida",
    origin: "Site",
    phone: "(41) 95432-1098",
    status: "Frio",
    time: "há 2h",
    email: "pedro.almeida@email.com",
  },
  {
    id: 5,
    name: "Juliana Santos",
    origin: "Google Ads",
    phone: "(51) 94321-0987",
    status: "Quente",
    time: "há 3h",
    email: "juliana.santos@email.com",
  },
  {
    id: 6,
    name: "Tiago Lopes",
    origin: "Facebook",
    phone: "(61) 93210-9876",
    status: "Morno",
    time: "há 5h",
    email: "tiago.lopes@email.com",
  },
  {
    id: 7,
    name: "Fernanda Rocha",
    origin: "Indicação",
    phone: "(71) 92109-8765",
    status: "Frio",
    time: "há 1 dia",
    email: "fernanda.rocha@email.com",
  },
  {
    id: 8,
    name: "Lucas Mendes",
    origin: "TikTok",
    phone: "(81) 91098-7654",
    status: "Quente",
    time: "há 1 dia",
    email: "lucas.mendes@email.com",
  },
];

const statusColors: Record<Status, string> = {
  Quente: "bg-red-100 text-red-600",
  Morno: "bg-yellow-100 text-yellow-600",
  Frio: "bg-gray-100 text-gray-500",
};

export default function LeadsVendedor() {
  const [activeTab, setActiveTab] = useState<TabKey>("Hoje");
  const [search, setSearch] = useState("");

  const tabs: TabKey[] = ["Hoje", "Esta Semana", "Todas"];

  const filteredLeads = mockLeads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      lead.email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Page Title */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-gray-900 text-xl font-bold">Meus Leads</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {mockLeads.length} leads cadastrados
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex bg-white rounded-2xl p-1 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mt-3">
        <div className="bg-white rounded-2xl flex items-center px-4 py-3 gap-3 shadow-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
          <button className="p-1">
            <Filter className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Leads List */}
      <div className="px-4 mt-3 space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Nenhum lead encontrado</p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-sm font-bold">
                      {lead.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-gray-800 text-sm font-semibold">
                        {lead.name}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          statusColors[lead.status]
                        }`}
                      >
                        {lead.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{lead.origin}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">{lead.phone}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{lead.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-xl bg-blue-50">
                    <Phone className="w-4 h-4 text-blue-600" />
                  </button>
                  <button className="p-2 rounded-xl bg-gray-50">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

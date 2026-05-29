import { useState } from "react";
import {
  FileText,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

type TabKey = "Em Andamento" | "Finalizados" | "Todos";

interface Contract {
  id: number;
  client: string;
  value: string;
  progress: number;
  status: string;
  nextStep: string;
  date: string;
}

const mockContracts: Contract[] = [
  {
    id: 1,
    client: "Marina Costa",
    value: "R$ 28.500",
    progress: 75,
    status: "Em análise",
    nextStep: "Assinatura digital",
    date: "15/05/2026",
  },
  {
    id: 2,
    client: "Rafael Souza",
    value: "R$ 45.000",
    progress: 40,
    status: "Aguardando docs",
    nextStep: "Envio de documentos",
    date: "10/05/2026",
  },
  {
    id: 3,
    client: "Camila Oliveira",
    value: "R$ 15.200",
    progress: 90,
    status: "Quase finalizado",
    nextStep: "Confirmação de pagamento",
    date: "08/05/2026",
  },
  {
    id: 4,
    client: "Pedro Almeida",
    value: "R$ 62.000",
    progress: 20,
    status: "Proposta enviada",
    nextStep: "Aprovação do cliente",
    date: "20/05/2026",
  },
  {
    id: 5,
    client: "Juliana Santos",
    value: "R$ 33.800",
    progress: 100,
    status: "Finalizado",
    nextStep: "—",
    date: "02/05/2026",
  },
  {
    id: 6,
    client: "Tiago Lopes",
    value: "R$ 19.900",
    progress: 100,
    status: "Finalizado",
    nextStep: "—",
    date: "25/04/2026",
  },
];

const statusIcon: Record<string, JSX.Element> = {
  "Em análise": <Clock className="w-3.5 h-1.5" />,
  "Aguardando docs": <Clock className="w-3.5 h-3.5" />,
  "Quase finalizado": <Clock className="w-3.5 h-3.5" />,
  "Proposta enviada": <FileText className="w-3.5 h-3.5" />,
  Finalizado: <CheckCircle className="w-3.5 h-3.5" />,
};

const statusColor: Record<string, string> = {
  "Em análise": "text-blue-600 bg-blue-50",
  "Aguardando docs": "text-yellow-600 bg-yellow-50",
  "Quase finalizado": "text-green-600 bg-green-50",
  "Proposta enviada": "text-purple-600 bg-purple-50",
  Finalizado: "text-green-600 bg-green-50",
};

export default function ContratosVendedor() {
  const [activeTab, setActiveTab] = useState<TabKey>("Em Andamento");

  const tabs: TabKey[] = ["Em Andamento", "Finalizados", "Todos"];

  const filtered = mockContracts.filter((c) => {
    if (activeTab === "Em Andamento")
      return c.status !== "Finalizado";
    if (activeTab === "Finalizados") return c.status === "Finalizado";
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Page Title */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-gray-900 text-xl font-bold">Meus Contratos</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {mockContracts.length} contratos no total
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

      {/* Contracts */}
      <div className="px-4 mt-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Nenhum contrato encontrado</p>
          </div>
        ) : (
          filtered.map((contract) => (
            <div
              key={contract.id}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-800 text-sm font-semibold">
                      {contract.client}
                    </p>
                    <p className="text-blue-600 text-base font-bold mt-0.5">
                      {contract.value}
                    </p>
                  </div>
                </div>
                <button className="p-2 rounded-xl bg-gray-50">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Progresso</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                      statusColor[contract.status]
                    }`}
                  >
                    {statusIcon[contract.status]}
                    {contract.status}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${contract.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-400">
                    Data: {contract.date}
                  </span>
                  <span className="text-xs text-gray-400">
                    {contract.progress}%
                  </span>
                </div>
              </div>

              {/* Next Step */}
              {contract.nextStep !== "—" && (
                <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Próximo passo:</span>
                  <span className="text-xs text-gray-700 font-medium">
                    {contract.nextStep}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

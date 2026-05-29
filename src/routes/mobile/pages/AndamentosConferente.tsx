import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2,
  FileText,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type Tab = "Aguardando" | "Em Conferência" | "Para Aprovar";

interface AndamentoItem {
  id: number;
  client: string;
  contractRef: string;
  itemsToCheck: number;
  step: number;
  dueDate: string;
  details: string[];
}

export default function AndamentosConferente() {
  const { perfil } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Aguardando");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const tabs: Tab[] = ["Aguardando", "Em Conferência", "Para Aprovar"];

  const allItems: AndamentoItem[] = [
    {
      id: 1,
      client: "Mercado Central Ltda",
      contractRef: "CTR-2025-0042",
      itemsToCheck: 24,
      step: 2,
      dueDate: "02/06/2026",
      details: [
        "Palete PKG-001 — 12 unid. divergentes",
        "Caixa de somatória — peso incompatível",
        "Conferência parcial aguardando romaneio",
      ],
    },
    {
      id: 2,
      client: "Distribuidora Oeste S.A.",
      contractRef: "CTR-2025-0051",
      itemsToCheck: 15,
      step: 1,
      dueDate: "03/06/2026",
      details: [
        "Aguardando entrega do romaneio fiscal",
        "Entrada registrada no sistema",
      ],
    },
    {
      id: 3,
      client: "Atacado Norte ME",
      contractRef: "CTR-2025-0063",
      itemsToCheck: 8,
      step: 3,
      dueDate: "01/06/2026",
      details: [
        "3 itens com divergência de quantidade",
        "1	item com avaria — foto em anexo",
      ],
    },
    {
      id: 4,
      client: "Fast Food Provisões EIRELI",
      contractRef: "CTR-2025-0039",
      itemsToCheck: 37,
      step: 2,
      dueDate: "04/06/2026",
      details: [
        "Conferência em andamento — 22 de 37 itens verificados",
        "Divergência: produto CTR-890 com etiqueta trocada",
      ],
    },
    {
      id: 5,
      client: "Super Atacado Regional",
      contractRef: "CTR-2025-0071",
      itemsToCheck: 5,
      step: 1,
      dueDate: "05/06/2026",
      details: ["Aguardando chegada do caminhão"],
    },
    {
      id: 6,
      client: "Vendabem Comércio Ltda",
      contractRef: "CTR-2025-0084",
      itemsToCheck: 19,
      step: 4,
      dueDate: "30/05/2026",
      details: [
        "Todas divergências resolvidas",
        "Pendente assinatura do responsável",
      ],
    },
  ];

  const getStepItems = (step: number) => [
    { label: "Recebido", done: step >= 1, current: step === 1 },
    { label: "Conferindo", done: step >= 2, current: step === 2 },
    { label: "Divergências?", done: step >= 3, current: step === 3 },
    { label: "Aprovado", done: step >= 4, current: step === 4 },
  ];

  const getStepColor = (done: boolean, current: boolean) => {
    if (done) return "bg-blue-600";
    if (current) return "bg-blue-600 animate-pulse";
    return "bg-gray-200";
  };

  const getStatusCount = (tab: Tab) => {
    if (tab === "Aguardando") return 2;
    if (tab === "Em Conferência") return 2;
    if (tab === "Para Aprovar") return 2;
    return 0;
  };

  const filteredItems = allItems.filter((item) => {
    if (activeTab === "Aguardando") return item.step === 1;
    if (activeTab === "Em Conferência") return item.step === 2;
    if (activeTab === "Para Aprovar") return item.step === 3 || item.step === 4;
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Andamentos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Acompanhe o progresso das suas conferências.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {tab}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab ? "bg-blue-500" : "bg-gray-100"
              }`}
            >
              {getStatusCount(tab)}
            </span>
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="flex flex-col gap-3">
        {filteredItems.map((item) => {
          const steps = getStepItems(item.step);
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="p-4">
                {/* Client & Contract */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.client}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-500">{item.contractRef}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-2 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.dueDate}</span>
                  </div>
                </div>

                {/* Items Count */}
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">
                      {item.itemsToCheck}
                    </span>{" "}
                    itens para conferir
                  </span>
                </div>

                {/* Step Tracker */}
                <div className="mb-4">
                  <div className="flex items-center gap-0.5">
                    {steps.map((s, idx) => (
                      <div key={idx} className="flex items-center flex-1">
                        <div
                          className={`flex flex-col items-center flex-1`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center ${getStepColor(
                              s.done,
                              s.current
                            )}`}
                          >
                            {s.done && !s.current ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : s.current ? (
                              <Clock className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-gray-300" />
                            )}
                          </div>
                          <p
                            className={`text-xs mt-1.5 text-center leading-tight ${
                              s.done || s.current
                                ? "text-gray-700 font-medium"
                                : "text-gray-400"
                            }`}
                          >
                            {s.label}
                          </p>
                        </div>
                        {idx < steps.length - 1 && (
                          <div
                            className={`h-0.5 flex-1 mb-6 ${
                              steps[idx + 1].done
                                ? "bg-blue-600"
                                : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expand/Collapse Toggle */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : item.id)
                  }
                  className="flex items-center gap-1 text-sm text-blue-600 font-medium w-full justify-center py-1.5 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      Ocultar detalhes{" "}
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Ver detalhes{" "}
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Expandable Details */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Detalhes
                  </p>
                  <ul className="flex flex-col gap-2">
                    {item.details.map((detail, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Nenhuma conferência nesta etapa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

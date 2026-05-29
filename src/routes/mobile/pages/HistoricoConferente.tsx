import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2,
  FileText,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

interface HistoricoItem {
  id: number;
  date: string;
  client: string;
  contractRef: string;
  itemsCount: number;
  totalValue: string;
  status: "Aprovado" | "Com Divergências";
}

export default function HistoricoConferente() {
  const { perfil } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(4); // 0=jan...11=dec
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const allHistorico: HistoricoItem[] = [
    { id: 1, date: "28/05/2026", client: "Mercado Central Ltda", contractRef: "CTR-2025-0042", itemsCount: 24, totalValue: "R$ 12.450,00", status: "Aprovado" },
    { id: 2, date: "27/05/2026", client: "Distribuidora Oeste S.A.", contractRef: "CTR-2025-0051", itemsCount: 15, totalValue: "R$ 7.830,00", status: "Com Divergências" },
    { id: 3, date: "26/05/2026", client: "Atacado Norte ME", contractRef: "CTR-2025-0063", itemsCount: 8, totalValue: "R$ 3.200,00", status: "Aprovado" },
    { id: 4, date: "23/05/2026", client: "Fast Food Provisões EIRELI", contractRef: "CTR-2025-0039", itemsCount: 37, totalValue: "R$ 21.900,00", status: "Com Divergências" },
    { id: 5, date: "22/05/2026", client: "Super Atacado Regional", contractRef: "CTR-2025-0071", itemsCount: 5, totalValue: "R$ 1.750,00", status: "Aprovado" },
    { id: 6, date: "20/05/2026", client: "Vendabem Comércio Ltda", contractRef: "CTR-2025-0084", itemsCount: 19, totalValue: "R$ 9.600,00", status: "Aprovado" },
    { id: 7, date: "19/05/2026", client: "Mercado Central Ltda", contractRef: "CTR-2025-0038", itemsCount: 30, totalValue: "R$ 15.100,00", status: "Com Divergências" },
    { id: 8, date: "16/05/2026", client: "Distribuidora Oeste S.A.", contractRef: "CTR-2025-0055", itemsCount: 11, totalValue: "R$ 5.430,00", status: "Aprovado" },
    { id: 9, date: "15/05/2026", client: "Atacado Norte ME", contractRef: "CTR-2025-0060", itemsCount: 22, totalValue: "R$ 11.080,00", status: "Aprovado" },
    { id: 10, date: "13/05/2026", client: "Fast Food Provisões EIRELI", contractRef: "CTR-2025-0032", itemsCount: 18, totalValue: "R$ 8.950,00", status: "Com Divergências" },
    { id: 11, date: "12/05/2026", client: "Qualitá Foods Ltda", contractRef: "CTR-2025-0091", itemsCount: 14, totalValue: "R$ 6.720,00", status: "Aprovado" },
    { id: 12, date: "09/05/2026", client: "Super Atacado Regional", contractRef: "CTR-2025-0075", itemsCount: 9, totalValue: "R$ 4.320,00", status: "Aprovado" },
    { id: 13, date: "07/05/2026", client: "Mercado Central Ltda", contractRef: "CTR-2025-0035", itemsCount: 27, totalValue: "R$ 13.540,00", status: "Aprovado" },
    { id: 14, date: "05/05/2026", client: "Vendabem Comércio Ltda", contractRef: "CTR-2025-0080", itemsCount: 6, totalValue: "R$ 2.980,00", status: "Com Divergências" },
    { id: 15, date: "02/05/2026", client: "Distribuidora Oeste S.A.", contractRef: "CTR-2025-0048", itemsCount: 20, totalValue: "R$ 10.260,00", status: "Aprovado" },
  ];

  const filteredHistorico = allHistorico.filter((item) =>
    item.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleItems = filteredHistorico.slice(0, visibleCount);
  const hasMore = visibleCount < filteredHistorico.length;

  const prevMonth = () => setSelectedMonth((m) => Math.max(0, m - 1));
  const nextMonth = () => setSelectedMonth((m) => Math.min(11, m + 1));

  const handleVerMais = () => setVisibleCount((c) => c + 10);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Histórico</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Conferências anteriores.
        </p>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm mb-4">
        <button
          onClick={prevMonth}
          disabled={selectedMonth === 0}
          className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <p className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">
          {months[selectedMonth]} 2026
        </p>
        <button
          onClick={nextMonth}
          disabled={selectedMonth === 11}
          className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Calendar className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por cliente..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setVisibleCount(10);
          }}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
        <span>
          {filteredHistorico.length} conferência
          {filteredHistorico.length !== 1 ? "s" : ""} em{" "}
          {months[selectedMonth]}
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.client}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {item.contractRef}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">{item.date}</span>
                  </div>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ml-2 ${
                  item.status === "Aprovado"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {item.status}
              </span>
            </div>

            <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">
                    {item.itemsCount}
                  </span>{" "}
                  itens
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-600 font-medium">
                  {item.totalValue}
                </span>
              </div>
            </div>

            {/* Status Icon */}
            <div className="flex items-center gap-2 mt-2">
              {item.status === "Aprovado" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              <span
                className={`text-xs ${
                  item.status === "Aprovado"
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              >
                {item.status === "Aprovado"
                  ? "Conferência aprovada sem ressalvas"
                  : "Necessária revisão de divergências"}
              </span>
            </div>
          </div>
        ))}

        {filteredHistorico.length === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Nenhuma conferência encontrada.
            </p>
          </div>
        )}
      </div>

      {/* Ver Mais */}
      {hasMore && (
        <button
          onClick={handleVerMais}
          className="w-full mt-4 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-2xl text-sm font-semibold hover:bg-blue-50 active:scale-95 transition-all"
        >
          Ver Mais
        </button>
      )}
    </div>
  );
}

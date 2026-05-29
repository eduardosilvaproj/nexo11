import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Search,
  User,
} from "lucide-react";
import { useState } from "react";

interface HistoricoItem {
  id: string;
  date: string;
  client: string;
  address: string;
  value: number;
  status: "concluido";
}

const allHistory: HistoricoItem[] = [
  { id: "1", date: "29/05/2026", client: "Carlos Silva", address: "Rua das Flores, 123 - Jd. Primavera", value: 350, status: "concluido" },
  { id: "2", date: "28/05/2026", client: "Maria Oliveira", address: "Av. Brasil, 456 - Centro", value: 780, status: "concluido" },
  { id: "3", date: "27/05/2026", client: "João Pereira", address: "Rua do Sol, 789 - Vila Nova", value: 1250, status: "concluido" },
  { id: "4", date: "26/05/2026", client: "Ana Costa", address: "Rua das Acácias, 321 - Jd. Esperança", value: 290, status: "concluido" },
  { id: "5", date: "25/05/2026", client: "Roberto Mendes", address: "Av. Independência, 654 - Centro", value: 920, status: "concluido" },
  { id: "6", date: "24/05/2026", client: "Fernanda Lima", address: "Rua das Palmeiras, 87 - Jd. Tropical", value: 410, status: "concluido" },
  { id: "7", date: "23/05/2026", client: "Lucas Almeida", address: "Av. das Nações, 112 - Vila Americana", value: 680, status: "concluido" },
  { id: "8", date: "22/05/2026", client: "Patrícia Souza", address: "Rua do Girassol, 55 - Jd. Aurora", value: 330, status: "concluido" },
  { id: "9", date: "21/05/2026", client: "Marcos Ferreira", address: "Av. Principal, 900 - Centro", value: 1050, status: "concluido" },
  { id: "10", date: "20/05/2026", client: "Beatriz Nunes", address: "Rua das Roseiras, 432 - Jd. Bela Vista", value: 275, status: "concluido" },
  { id: "11", date: "19/05/2026", client: "Rafael Costa", address: "Av. Brasil, 201 - Centro", value: 560, status: "concluido" },
  { id: "12", date: "18/05/2026", client: "Camila Rodrigues", address: "Rua do Limão, 78 - Vila São José", value: 390, status: "concluido" },
  { id: "13", date: "17/05/2026", client: "Daniel Martins", address: "Av. Getúlio Vargas, 445 - Jd. Industrial", value: 820, status: "concluido" },
  { id: "14", date: "16/05/2026", client: "Luciana Vieira", address: "Rua das Margaridas, 12 - Jd. das Flores", value: 460, status: "concluido" },
  { id: "15", date: "15/05/2026", client: "Thiago Nunes", address: "Av. JK, 333 - Centro", value: 730, status: "concluido" },
];

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const years = ["2024", "2025", "2026"];

const PAGE_SIZE = 10;

export default function HistoricoMedidor() {
  const [selectedMonth, setSelectedMonth] = useState(4); // May (0-indexed)
  const [selectedYear, setSelectedYear] = useState("2026");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredHistory = allHistory.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const visibleItems = filteredHistory.slice(0, visibleCount);
  const hasMore = visibleCount < filteredHistory.length;

  return (
    <div className="px-4 py-3 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Histórico</h1>
        <p className="text-xs text-slate-500 mt-0.5">Suas medições anteriores</p>
      </div>

      {/* Month / Year Selector */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por cliente ou endereço..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {filteredHistory.length} medição{filteredHistory.length !== 1 ? "ões" : ""} encontrada{filteredHistory.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
            <Search className="w-10 h-10 opacity-40" />
            <p className="text-sm">Nenhuma medição encontrada</p>
          </div>
        ) : (
          visibleItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {item.client}
                    </p>
                    <span className="text-sm font-bold text-emerald-600 flex-shrink-0">
                      R$ {item.value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <p className="text-xs text-slate-500 truncate">{item.address}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-400">{item.date}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span className="text-[10px] font-semibold text-emerald-700">
                        Concluído
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full py-3 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
        >
          Carregar mais ({filteredHistory.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
}
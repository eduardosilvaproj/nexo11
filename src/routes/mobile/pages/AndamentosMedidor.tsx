import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import { useState } from "react";

type FilterTab = "pendentes" | "em_curso" | "aguardando";

interface MedicaoItem {
  id: string;
  client: string;
  address: string;
  scheduledDate: string;
  status: "pendente" | "em_curso" | "aguardando";
  steps: {
    label: string;
    done: boolean;
    current: boolean;
  }[];
}

export default function AndamentosMedidor() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("em_curso");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allItems: MedicaoItem[] = [
    {
      id: "1",
      client: "Carlos Silva",
      address: "Rua das Flores, 123 - Jd. Primavera",
      scheduledDate: "29/05/2026 - 09:00",
      status: "em_curso",
      steps: [
        { label: "Agendado", done: true, current: false },
        { label: "No Local", done: true, current: false },
        { label: "Medindo", done: false, current: true },
        { label: "Revisando", done: false, current: false },
        { label: "Finalizado", done: false, current: false },
      ],
    },
    {
      id: "2",
      client: "Maria Oliveira",
      address: "Av. Brasil, 456 - Centro",
      scheduledDate: "29/05/2026 - 11:30",
      status: "pendente",
      steps: [
        { label: "Agendado", done: false, current: true },
        { label: "No Local", done: false, current: false },
        { label: "Medindo", done: false, current: false },
        { label: "Revisando", done: false, current: false },
        { label: "Finalizado", done: false, current: false },
      ],
    },
    {
      id: "3",
      client: "João Pereira",
      address: "Rua do Sol, 789 - Vila Nova",
      scheduledDate: "28/05/2026 - 14:00",
      status: "em_curso",
      steps: [
        { label: "Agendado", done: true, current: false },
        { label: "No Local", done: false, current: true },
        { label: "Medindo", done: false, current: false },
        { label: "Revisando", done: false, current: false },
        { label: "Finalizado", done: false, current: false },
      ],
    },
    {
      id: "4",
      client: "Ana Costa",
      address: "Rua das Acácias, 321 - Jd. Esperança",
      scheduledDate: "27/05/2026 - 10:00",
      status: "aguardando",
      steps: [
        { label: "Agendado", done: true, current: false },
        { label: "No Local", done: true, current: false },
        { label: "Medindo", done: true, current: false },
        { label: "Revisando", done: false, current: true },
        { label: "Finalizado", done: false, current: false },
      ],
    },
    {
      id: "5",
      client: "Roberto Mendes",
      address: "Av. Independência, 654 - Centro",
      scheduledDate: "26/05/2026 - 15:00",
      status: "pendente",
      steps: [
        { label: "Agendado", done: false, current: true },
        { label: "No Local", done: false, current: false },
        { label: "Medindo", done: false, current: false },
        { label: "Revisando", done: false, current: false },
        { label: "Finalizado", done: false, current: false },
      ],
    },
  ];

  const filteredItems = allItems.filter((item) => {
    if (activeFilter === "pendentes") return item.status === "pendente";
    if (activeFilter === "em_curso") return item.status === "em_curso";
    if (activeFilter === "aguardando") return item.status === "aguardando";
    return true;
  });

  const statusConfig = {
    pendente: {
      label: "Pendente",
      bg: "bg-slate-100",
      text: "text-slate-600",
      dot: "bg-slate-400",
    },
    em_curso: {
      label: "Em Curso",
      bg: "bg-blue-100",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
    aguardando: {
      label: "Aguardando Aprovação",
      bg: "bg-amber-100",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
  };

  const filters: { key: FilterTab; label: string }[] = [
    { key: "pendentes", label: "Pendentes" },
    { key: "em_curso", label: "Em Curso" },
    { key: "aguardando", label: "Aguardando" },
  ];

  return (
    <div className="px-4 py-3 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Andamentos</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Acompanhe suas medições em curso
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
              activeFilter === filter.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="flex flex-col gap-3">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
            <CheckCircle className="w-10 h-10 opacity-40" />
            <p className="text-sm">Nenhuma medição nesta categoria</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const config = statusConfig[item.status];
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
              >
                {/* Card Header */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : item.id)
                  }
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div
                    className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <div className={`w-2.5 h-2.5 ${config.dot} rounded-full`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {item.client}
                      </p>
                      <span
                        className={`${config.bg} ${config.text} text-[10px] font-semibold px-2 py-1 rounded-lg flex-shrink-0`}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <p className="text-xs text-slate-500 truncate">
                        {item.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <p className="text-xs text-slate-400">{item.scheduledDate}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-100 pt-3">
                    {/* Client Info */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-600">{item.client}</span>
                    </div>

                    {/* Progress Tracker */}
                    <div className="flex items-center gap-1">
                      {item.steps.map((step, idx) => (
                        <div key={step.label} className="flex items-center flex-1">
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                step.current
                                  ? "bg-blue-600 text-white ring-2 ring-blue-200"
                                  : step.done
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-200 text-slate-400"
                              }`}
                            >
                              {step.done ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={`text-[9px] leading-tight text-center ${
                                step.current
                                  ? "text-blue-600 font-semibold"
                                  : step.done
                                  ? "text-slate-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {idx < item.steps.length - 1 && (
                            <div
                              className={`h-0.5 flex-1 mb-4 rounded-full ${
                                item.steps[idx + 1]?.done || item.steps[idx + 1]?.current
                                  ? "bg-emerald-400"
                                  : "bg-slate-200"
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <button className="w-full py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                      Atualizar Status
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
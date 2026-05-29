import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Building2,
  Factory,
  Home,
  TrendingUp,
  Wallet,
} from "lucide-react";

export default function ValoresMedidor() {
  const totalThisMonth = 12850;
  const totalLastMonth = 11420;
  const diff = totalThisMonth - totalLastMonth;
  const diffPercent = (((totalThisMonth - totalLastMonth) / totalLastMonth) * 100).toFixed(1);
  const isUp = diff >= 0;

  const measurements = [
    { id: "1", date: "29/05", client: "Carlos Silva", type: "Residencial", value: 350 },
    { id: "2", date: "28/05", client: "Maria Oliveira", type: "Comercial", value: 780 },
    { id: "3", date: "27/05", client: "João Pereira", type: "Industrial", value: 1250 },
    { id: "4", date: "26/05", client: "Ana Costa", type: "Residencial", value: 290 },
    { id: "5", date: "25/05", client: "Roberto Mendes", type: "Comercial", value: 920 },
  ];

  const breakdown = [
    {
      type: "Residencial",
      icon: Home,
      count: 24,
      total: 7200,
      color: "bg-blue-500",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      type: "Comercial",
      icon: Building2,
      count: 16,
      total: 3800,
      color: "bg-violet-500",
      bg: "bg-violet-50",
      text: "text-violet-600",
    },
    {
      type: "Industrial",
      icon: Factory,
      count: 7,
      total: 1850,
      color: "bg-teal-500",
      bg: "bg-teal-50",
      text: "text-teal-600",
    },
  ];

  const weeklyValues = [
    { week: "Sem 1", value: 2800 },
    { week: "Sem 2", value: 3200 },
    { week: "Sem 3", value: 2950 },
    { week: "Sem 4", value: 3900 },
  ];

  const maxWeekly = Math.max(...weeklyValues.map((w) => w.value));

  return (
    <div className="px-4 py-3 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Valores</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Acompanhe seus ganhos e estatísticas
        </p>
      </div>

      {/* Total Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-200" />
            <span className="text-sm text-blue-100 font-medium">
              Este Mês
            </span>
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
              isUp
                ? "bg-emerald-500/20 text-emerald-200"
                : "bg-red-500/20 text-red-200"
            }`}
          >
            {isUp ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            {diffPercent}%
          </div>
        </div>
        <div>
          <p className="text-3xl font-bold text-white">
            R$ {totalThisMonth.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-blue-200 mt-1">
            {isUp ? "+" : ""}R$ {diff.toLocaleString("pt-BR")} vs mês anterior
          </p>
        </div>
      </div>

      {/* Weekly Bar Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            Valores Semanais
          </h2>
        </div>
        <div className="flex items-end gap-3 h-32 px-1">
          {weeklyValues.map((week) => {
            const heightPct = (week.value / maxWeekly) * 100;
            return (
              <div
                key={week.week}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="w-full flex items-end justify-center h-24">
                  <div
                    className="w-full max-w-[48px] bg-blue-600 rounded-t-lg transition-all relative group"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      R$ {week.value.toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {week.week}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown by Type */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            Por Tipo
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {breakdown.map((item) => {
            const Icon = item.icon;
            const pct = ((item.total / totalThisMonth) * 100).toFixed(0);
            return (
              <div key={item.type} className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-5 h-5 ${item.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">
                      {item.type}
                    </span>
                    <span className="text-xs text-slate-500">{item.count} medições</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-semibold text-slate-800">
                      R$ {item.total.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-[10px] text-slate-400">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Measurements */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">
         Últimas Medições
        </h2>
        <div className="flex flex-col gap-2">
          {measurements.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-slate-700">
                  {m.client}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{m.date}</span>
                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[10px] text-slate-400">{m.type}</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-800">
                R$ {m.value.toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
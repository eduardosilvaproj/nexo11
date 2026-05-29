import { Flag, TrendingUp, Award, Check } from "lucide-react";

const months = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface MonthlyGoal {
  month: string;
  target: number;
  achieved: boolean;
  percentage: number;
}

const monthlyData: MonthlyGoal[] = [
  { month: "Jan", target: 60000, achieved: true, percentage: 112 },
  { month: "Fev", target: 60000, achieved: true, percentage: 88 },
  { month: "Mar", target: 60000, achieved: true, percentage: 105 },
  { month: "Abr", target: 60000, achieved: true, percentage: 92 },
  { month: "Mai", target: 60000, achieved: false, percentage: 67 },
  { month: "Jun", target: 60000, achieved: false, percentage: 0 },
  { month: "Jul", target: 60000, achieved: false, percentage: 0 },
  { month: "Ago", target: 60000, achieved: false, percentage: 0 },
  { month: "Set", target: 60000, achieved: false, percentage: 0 },
  { month: "Out", target: 60000, achieved: false, percentage: 0 },
  { month: "Nov", target: 60000, achieved: false, percentage: 0 },
  { month: "Dez", target: 60000, achieved: false, percentage: 0 },
];

const currentTarget = 60000;
const currentAchieved = 45200;
const currentPercentage = Math.round((currentAchieved / currentTarget) * 100);

const weeklyTarget = {
  current: 8500,
  target: 15000,
  percentage: Math.round((8500 / 15000) * 100),
};

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 52;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="#2563eb"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
        <span className="text-xs text-gray-400">atingido</span>
      </div>
    </div>
  );
}

export default function MetasVendedor() {
  const currentMonth = new Date().toLocaleDateString("pt-BR", {
    month: "long",
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Page Title */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-gray-900 text-xl font-bold">Minhas Metas</h1>
        <p className="text-gray-500 text-sm mt-0.5 capitalize">
          {currentMonth} de 2026
        </p>
      </div>

      {/* Main Progress */}
      <div className="px-4 mt-2">
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center">
          <CircularProgress percentage={currentPercentage} />
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">Meta Mensal</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {currentAchieved.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              })}{" "}
              <span className="text-gray-400 font-normal text-sm">
                /{" "}
                {currentTarget.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })}
              </span>
            </p>
          </div>
          <div className="w-full mt-4 bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{ width: `${currentPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Faltam{" "}
            {(currentTarget - currentAchieved).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            })}{" "}
            para atingir a meta
          </p>
        </div>
      </div>

      {/* Weekly Target */}
      <div className="px-4 mt-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-800">
                Meta Semanal
              </span>
            </div>
            <span className="text-xs text-blue-600 font-bold">
              {weeklyTarget.percentage}%
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">Progresso</span>
              <span className="text-xs text-gray-500">
                {weeklyTarget.current.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })}{" "}
                /{" "}
                {weeklyTarget.target.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-orange-400"
                style={{ width: `${weeklyTarget.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="px-4 mt-4">
        <h2 className="text-gray-800 font-semibold text-base mb-3">
          Visão Anual
        </h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-4 gap-2">
            {monthlyData.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl ${
                  m.achieved
                    ? "bg-green-50"
                    : m.percentage > 0
                    ? "bg-blue-50"
                    : "bg-gray-50"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    m.achieved ? "bg-green-500" : "bg-gray-200"
                  }`}
                >
                  {m.achieved && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    m.achieved
                      ? "text-green-700"
                      : m.percentage > 0
                      ? "text-blue-600"
                      : "text-gray-400"
                  }`}
                >
                  {m.month}
                </span>
                <span
                  className={`text-xs font-bold ${
                    m.achieved
                      ? "text-green-600"
                      : m.percentage > 0
                      ? "text-blue-500"
                      : "text-gray-300"
                  }`}
                >
                  {m.percentage > 0 ? `${m.percentage}%` : "—"}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500">Atingida</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500">Em andamento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <span className="text-xs text-gray-500">Pendente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

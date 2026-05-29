import { TrendingUp, AlertCircle } from 'lucide-react';

export default function ResumoAdmin() {
  const kpis = [
    { label: 'Hoje', value: '12', sub: 'vendas' },
    { label: 'Esta Semana', value: '47', sub: 'vendas' },
    { label: 'Este Mês', value: '183', sub: 'vendas' },
  ];

  const teamPerformance = [
    { name: 'Carlos Silva', value: 92 },
    { name: 'Ana Costa', value: 78 },
    { name: 'Lucas Lima', value: 65 },
    { name: 'Pedro Santos', value: 54 },
  ];

  const statusData = [
    { label: 'Concluído', pct: 58, color: 'bg-blue-600' },
    { label: 'Em Andamento', pct: 27, color: 'bg-green-500' },
    { label: 'Pendente', pct: 15, color: 'bg-orange-400' },
  ];

  const pendencies = [
    { label: 'Confirmar medição com cliente Roberto', priority: 'high', time: 'há 2h' },
    { label: 'Revisar cronograma de montagens', priority: 'medium', time: 'há 5h' },
    { label: 'Atualizar status de entrega do dia 30', priority: 'medium', time: 'há 1d' },
    { label: 'Aprovar orçamento para Maria Oliveira', priority: 'low', time: 'há 2d' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      {/* KPI Cards */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 -mx-4 px-4 scrollbar-hide">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="flex-shrink-0 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 w-36"
          >
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <TrendingUp size={12} /> {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Performance por Equipe */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Performance por Equipe
        </h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          {teamPerformance.map((member, i) => (
            <div key={i}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{member.name}</span>
                <span className="text-sm font-semibold text-gray-900">{member.value}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${member.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Geral */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Status Geral</h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            {/* Pie chart representation */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <div className="absolute inset-0 rounded-full overflow-hidden flex">
                {statusData.map((item, i) => {
                  const radius = 48;
                  const circumference = 2 * Math.PI * radius;
                  const offset = statusData
                    .slice(0, i)
                    .reduce((acc, s) => acc + (s.pct / 100) * circumference, 0);
                  return (
                    <div
                      key={i}
                      className={`${item.color} flex-shrink-0`}
                      style={{
                        width: `${(item.pct / 100) * circumference}px`,
                        height: '96px',
                      }}
                    />
                  );
                })}
              </div>
              <div className="absolute inset-2 bg-white rounded-full" />
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-2">
              {statusData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                  <span className="text-xs text-gray-600 flex-1">{item.label}</span>
                  <span className="text-xs font-semibold text-gray-900">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pendências */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900">Pendências</h2>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {pendencies.map((item, i) => (
            <div
              key={i}
              className={`px-4 py-3 flex items-start justify-between gap-3 ${
                i < pendencies.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <div
                  className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    item.priority === 'high'
                      ? 'bg-red-500'
                      : item.priority === 'medium'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  }`}
                />
                <p className="text-sm text-gray-700">{item.label}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import { BarChart3, TrendingUp, AlertCircle, Calendar, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardAdmin() {
  const { perfil } = useAuth();

  const today = new Date();
  const dateStr = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const stats = [
    { label: 'Vendas Hoje', value: '12', icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Medições', value: '5', icon: BarChart3, color: 'text-blue-600' },
    { label: 'Conferências', value: '8', icon: Users, color: 'text-blue-600' },
    { label: 'Montagens', value: '3', icon: Calendar, color: 'text-blue-600' },
    { label: 'Entregas', value: '6', icon: AlertCircle, color: 'text-blue-600' },
  ];

  const alerts = [
    { type: 'pending', label: '2 medições pendentes de confirmação', priority: 'high' },
    { type: 'overdue', label: '1 montagem atrasada desde ontem', priority: 'medium' },
    { type: 'issue', label: 'Cliente aguardando retorno há 3 dias', priority: 'low' },
  ];

  const quickActions = [
    { label: 'Ver Resumo', icon: BarChart3 },
    { label: 'Agenda Geral', icon: Calendar },
    { label: 'Notificações', icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {perfil?.nome ?? 'Admin'}
        </h1>
        <p className="text-sm text-gray-500 capitalize mt-1">{dateStr}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className={`mb-2 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900">Alertas</h2>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`px-4 py-3 flex items-start gap-3 ${
                i < alerts.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div
                className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  alert.priority === 'high'
                    ? 'bg-red-500'
                    : alert.priority === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
              />
              <p className="text-sm text-gray-700">{alert.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Ações Rápidas</h2>
        <div className="flex gap-3">
          {quickActions.map((action, i) => (
            <button
              key={i}
              className="flex-1 bg-blue-600 text-white rounded-2xl py-3 px-4 flex flex-col items-center gap-1 shadow-sm active:scale-95 transition-transform"
            >
              <action.icon size={18} />
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
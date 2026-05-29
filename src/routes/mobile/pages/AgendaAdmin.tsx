import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const eventTypes = {
  medição: { color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  montagem: { color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  entrega: { color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  reunião: { color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
};

const agendaData: Record<number, Array<{
  type: keyof typeof eventTypes;
  start: number;
  end: number;
  member: string;
  client: string;
  location: string;
}>> = {
  7: [
    { type: 'medição', start: 7, end: 9, member: 'Carlos Silva', client: 'João Mendes', location: 'Rua das Flores, 42' },
    { type: 'montagem', start: 8, end: 11, member: 'Ana Costa', client: 'Maria Oliveira', location: 'Av. Brasil, 108' },
  ],
  9: [
    { type: 'reunião', start: 9, end: 10, member: 'Pedro Santos', client: 'Eq. Montagem', location: 'Sala de Reuniões' },
    { type: 'entrega', start: 9, end: 12, member: 'Lucas Lima', client: 'Fernanda Souza', location: 'Rua do Sol, 15' },
  ],
  10: [
    { type: 'medição', start: 10, end: 12, member: 'Carlos Silva', client: 'Roberto Alves', location: 'Rua Nova, 88' },
  ],
  11: [
    { type: 'medição', start: 11, end: 13, member: 'Ana Costa', client: 'Cláudia Nunes', location: 'Av. Central, 200' },
  ],
  14: [
    { type: 'montagem', start: 14, end: 17, member: 'Lucas Lima', client: 'Paulo Ribeiro', location: 'Rua da Paz, 33' },
    { type: 'reunião', start: 14, end: 15, member: 'Pedro Santos', client: 'Eq. Vendas', location: 'Sala 2' },
  ],
  16: [
    { type: 'entrega', start: 16, end: 18, member: 'Carlos Silva', client: 'Diana Ferreira', location: 'Rua do Lago, 12' },
  ],
};

export default function AgendaAdmin() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 29));

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayName = days[currentDate.getDay()];
  const dayNum = currentDate.getDate();
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });

  const hours = Array.from({ length: 13 }, (_, i) => i + 7);

  const prevDay = () => setCurrentDate(d => new Date(d.getTime() - 86400000));
  const nextDay = () => setCurrentDate(d => new Date(d.getTime() + 86400000));

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Agenda Geral</h1>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
          <button onClick={prevDay} className="p-1 active:scale-90 transition-transform">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 capitalize">
            {dayName}, {dayNum} de {monthName}
          </span>
          <button onClick={nextDay} className="p-1 active:scale-90 transition-transform">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {hours.map(hour => {
          const events = agendaData[hour] ?? [];
          return (
            <div key={hour} className="flex gap-3 min-h-[56px] border-t border-gray-200 py-2">
              {/* Hour Label */}
              <div className="w-12 flex-shrink-0">
                <span className="text-xs text-gray-400 font-medium">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>

              {/* Events */}
              <div className="flex-1 flex flex-col gap-1">
                {events.length === 0 ? (
                  <div className="h-8 rounded-lg bg-gray-100 opacity-50" />
                ) : (
                  events.map((ev, idx) => {
                    const typeStyle = eventTypes[ev.type];
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl px-3 py-2 ${typeStyle.color} flex flex-col gap-0.5`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold capitalize">{ev.type}</span>
                          <div className={`w-2 h-2 rounded-full ${typeStyle.dot}`} />
                        </div>
                        <p className="text-xs font-medium text-gray-800">{ev.member}</p>
                        <p className="text-xs text-gray-600 truncate">
                          {ev.client} · {ev.location}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
import { ChevronLeft, ChevronRight, Clock, MapPin, User } from "lucide-react";
import { useState } from "react";

interface Appointment {
  id: number;
  time: string;
  client: string;
  address: string;
  duration: string;
  status: "Agendada" | "Em Andamento" | "Concluída";
}

interface DaySchedule {
  date: string;
  dayName: string;
  dayNum: number;
  monthName: string;
  isToday: boolean;
  appointments: Appointment[];
}

const weekDays: DaySchedule[] = [
  {
    date: "2026-05-25",
    dayName: "Segunda",
    dayNum: 25,
    monthName: "Mai",
    isToday: false,
    appointments: [
      { id: 1, time: "08:00", client: "Paulo Henrique Lima", address: "Av. das Nações, 890 - Centro", duration: "4h", status: "Concluída" },
      { id: 2, time: "14:00", client: "Fernanda Alves Costa", address: "Rua do Sol, 123 - Jd. Solar", duration: "3h", status: "Concluída" },
    ],
  },
  {
    date: "2026-05-26",
    dayName: "Terça",
    dayNum: 26,
    monthName: "Mai",
    isToday: false,
    appointments: [
      { id: 3, time: "08:00", client: "Juliana Santos Oliveira", address: "Av. Central, 200 - Centro", duration: "5h", status: "Concluída" },
    ],
  },
  {
    date: "2026-05-27",
    dayName: "Quarta",
    dayNum: 27,
    monthName: "Mai",
    isToday: false,
    appointments: [
      { id: 4, time: "09:00", client: "Ana Paula Rodrigues", address: "Rua das Palmeiras, 567 - Jd. Europa", duration: "6h", status: "Concluída" },
    ],
  },
  {
    date: "2026-05-28",
    dayName: "Quinta",
    dayNum: 28,
    monthName: "Mai",
    isToday: false,
    appointments: [
      { id: 5, time: "08:00", client: "Paulo Henrique Lima", address: "Av. das Nações, 890 - Centro", duration: "4h", status: "Concluída" },
      { id: 6, time: "14:00", client: "Fernanda Alves Costa", address: "Rua do Sol, 123 - Jd. Solar", duration: "3h", status: "Concluída" },
    ],
  },
  {
    date: "2026-05-29",
    dayName: "Sexta",
    dayNum: 29,
    monthName: "Mai",
    isToday: true,
    appointments: [
      { id: 7, time: "08:00", client: "Carlos Eduardo Silva", address: "Rua das Acácias, 234 - Jd. Primavera", duration: "3h", status: "Agendada" },
      { id: 8, time: "11:30", client: "Mariana Costa Oliveira", address: "Av. Brasil, 1500 - Centro", duration: "4h", status: "Agendada" },
      { id: 9, time: "14:00", client: "Roberto Ferreira Souza", address: "Rua dos Ipês, 89 - Vila Nova", duration: "2h", status: "Agendada" },
    ],
  },
  {
    date: "2026-05-30",
    dayName: "Sábado",
    dayNum: 30,
    monthName: "Mai",
    isToday: false,
    appointments: [
      { id: 10, time: "09:00", client: "Ana Paula Rodrigues", address: "Rua das Palmeiras, 567 - Jd. Europa", duration: "5h", status: "Agendada" },
    ],
  },
  {
    date: "2026-05-31",
    dayName: "Domingo",
    dayNum: 31,
    monthName: "Mai",
    isToday: false,
    appointments: [
      { id: 11, time: "08:30", client: "Lucas Martins Pereira", address: "Rua das Rosas, 45 - Jd. das Flores", duration: "4h", status: "Agendada" },
    ],
  },
];

const statusColors: Record<string, string> = {
  Agendada: "bg-blue-100 text-blue-700",
  "Em Andamento": "bg-amber-100 text-amber-700",
  Concluída: "bg-emerald-100 text-emerald-700",
};

export default function AgendaMontador() {
  const [weekOffset, setWeekOffset] = useState(0);

  // Simple week navigation using the same data
  const days = weekDays;

  const totalAppointments = days.reduce((sum, d) => sum + d.appointments.length, 0);

  return (
    <div className="min-h-screen bg-gray-100 pb-6">
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-6 pb-4 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Agenda Semanal</h1>
            <p className="text-blue-200 text-sm mt-1">
              {totalAppointments} agendamentos
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center active:bg-blue-400 transition-colors"
            >
              <ChevronLeft className="text-white w-5 h-5" />
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center active:bg-blue-400 transition-colors"
            >
              <ChevronRight className="text-white w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-blue-200 text-xs mt-2 text-center">
          25 a 31 de Maio, 2026
        </p>
      </div>

      {/* Days */}
      <div className="px-4 py-4 space-y-4">
        {days.map((day) => (
          <div key={day.date}>
            {/* Day Header */}
            <div
              className={`flex items-center gap-3 mb-2 px-3 py-2 rounded-xl ${
                day.isToday
                  ? "bg-blue-600"
                  : day.appointments.length > 0
                  ? "bg-white shadow-sm"
                  : "bg-white/50"
              }`}
            >
              <div className="text-center">
                <p className={`text-xs font-medium ${day.isToday ? "text-blue-200" : "text-gray-400"}`}>
                  {day.dayName.slice(0, 3)}
                </p>
                <p className={`text-xl font-bold ${day.isToday ? "text-white" : "text-gray-900"}`}>
                  {day.dayNum}
                </p>
              </div>
              <div className="flex-1 border-l border-gray-200 pl-3">
                {day.isToday ? (
                  <span className="text-white text-xs font-semibold">Hoje</span>
                ) : (
                  <span className="text-gray-500 text-xs">{day.monthName}</span>
                )}
                {day.appointments.length > 0 && (
                  <span className="text-xs text-gray-400 ml-2">
                    ({day.appointments.length} {day.appointments.length === 1 ? "agenda" : "agendas"})
                  </span>
                )}
              </div>
              {day.appointments.length === 0 && (
                <span className="text-gray-400 text-xs">Sem agendamentos</span>
              )}
            </div>

            {/* Appointments */}
            {day.appointments.length > 0 && (
              <div className="space-y-2 pl-2">
                {day.appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={`bg-white rounded-2xl p-3 shadow-sm ${
                      day.isToday && apt.status === "Agendada"
                        ? "border-l-4 border-blue-600"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{apt.time}</p>
                          <p className="text-xs text-gray-400">{apt.duration}</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${statusColors[apt.status]}`}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium text-gray-800">{apt.client}</p>
                    </div>
                    <div className="flex items-start gap-2 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-gray-500">{apt.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
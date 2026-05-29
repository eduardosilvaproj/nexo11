import { useAuth } from "@/contexts/AuthContext";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { useState } from "react";

const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const mockDeliveries: Record<string, Array<{
  id: number;
  hora: string;
  cliente: string;
  endereco: string;
  itens: number;
  duracao: number;
}>> = {
  Seg: [
    { id: 1, hora: "08:00", cliente: "Carlos Lima", endereco: "Rua do Sol, 55", itens: 3, duracao: 20 },
    { id: 2, hora: "10:30", cliente: "Paula Rocha", endereco: "Av. Central, 100", itens: 1, duracao: 15 },
  ],
  Ter: [
    { id: 3, hora: "09:00", cliente: "Roberto Alves", endereco: "Rua das Acácias, 200", itens: 5, duracao: 25 },
  ],
  Qua: [],
  Qui: [
    { id: 4, hora: "08:00", cliente: "Fernanda Dias", endereco: "Tv. das Palmeiras, 12", itens: 2, duracao: 20 },
    { id: 5, hora: "11:00", cliente: "Lucas Mendes", endereco: "Rua dos Ipês, 88", itens: 4, duracao: 30 },
    { id: 6, hora: "14:00", cliente: "Sofia Nunes", endereco: "Av. Getúlio, 330", itens: 2, duracao: 20 },
  ],
  Sex: [
    { id: 7, hora: "08:30", cliente: "Marcos Vinícius", endereco: "Rua 7 de Setembro, 44", itens: 6, duracao: 35 },
  ],
  Sáb: [{ id: 8, hora: "09:00", cliente: "Juliana Ferreira", endereco: "Rua das Primaveras, 77", itens: 3, duracao: 25 }],
  Dom: [],
};

export default function AgendaEntregue() {
  const { perfil } = useAuth();
  const [semanaOffset, setSemanaOffset] = useState(0);

  const hoje = new Date();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1 + semanaOffset * 7);

  const diasComData = diasSemana.map((dia, i) => {
    const data = new Date(inicioSemana);
    data.setDate(inicioSemana.getDate() + i);
    return { nome: dia, data, chave: diasSemana[i] };
  });

  const isToday = (data: Date) => {
    return (
      data.getDate() === hoje.getDate() &&
      data.getMonth() === hoje.getMonth() &&
      data.getFullYear() === hoje.getFullYear()
    );
  };

  const hojeChave = diasSemana[hoje.getDay() === 0 ? 6 : hoje.getDay() - 1];
  const [diaSelecionado, setDiaSelecionado] = useState(hojeChave);

  const deliveries = mockDeliveries[diaSelecionado] || [];

  return (
    <div className="px-4 py-3 pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar size={20} className="text-blue-600" />
        <h1 className="text-lg font-bold text-gray-900">Agenda de Entregas</h1>
      </div>

      {/* Week Navigation */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSemanaOffset((p) => p - 1)}
            className="p-2 rounded-xl hover:bg-gray-100"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {inicioSemana.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
            {" - "}
            {new Date(inicioSemana.getTime() + 6 * 86400000).toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "short",
            })}
          </span>
          <button
            onClick={() => setSemanaOffset((p) => p + 1)}
            className="p-2 rounded-xl hover:bg-gray-100"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Day Selector */}
        <div className="grid grid-cols-7 gap-1.5">
          {diasComData.map((dia) => {
            const count = (mockDeliveries[dia.chave] || []).length;
            const atual = isToday(dia.data);
            const ativo = diaSelecionado === dia.chave;
            return (
              <button
                key={dia.chave}
                onClick={() => setDiaSelecionado(dia.chave)}
                className={`flex flex-col items-center rounded-xl py-2.5 px-1 transition-all ${
                  ativo
                    ? "bg-blue-600 text-white shadow-md"
                    : atual
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-100"
                }`}
              >
                <span className="text-xs font-medium">{dia.nome}</span>
                <span className="text-xs mt-0.5">{dia.data.getDate()}</span>
                {count > 0 && (
                  <span
                    className={`text-xs mt-1 px-1.5 rounded-full ${
                      ativo
                        ? "bg-white/20 text-white"
                        : "bg-blue-200 text-blue-700"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Deliveries for selected day */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Entregas de{" "}
          <span className="text-blue-600 capitalize">
            {diaSelecionado.toLowerCase() === hojeChave.toLowerCase()
              ? "hoje"
              : diaSelecionado}
          </span>
        </h2>
        {deliveries.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma entrega neste dia</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map((d) => (
              <div
                key={d.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex flex-col items-center bg-blue-100 rounded-xl px-2 py-1.5">
                  <Clock size={12} className="text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700 mt-0.5">
                    {d.hora}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{d.cliente}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <MapPin size={11} />
                    <span className="truncate">{d.endereco}</span>
                  </div>
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                    <span>{d.itens} {d.itens === 1 ? "item" : "itens"}</span>
                    <span>~{d.duracao} min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { ChevronRight, MapPin, Phone, Package, AlertTriangle } from "lucide-react";

interface RomaneioItem {
  id: number;
  seq: number;
  cliente: string;
  endereco: string;
  telefone: string;
  itens: number;
  instrucoes: string;
  entregue: boolean;
}

const mockRomaneio: RomaneioItem[] = [
  {
    id: 1,
    seq: 1,
    cliente: "Maria Silva",
    endereco: "Rua das Flores, 123 - Centro",
    telefone: "(11) 98765-4321",
    itens: 4,
    instrucoes: "Deixar na portaria",
    entregue: true,
  },
  {
    id: 2,
    seq: 2,
    cliente: "João Santos",
    endereco: "Av. Brasil, 456 - Jardim das Acácias",
    telefone: "(11) 91234-5678",
    itens: 2,
    instrucoes: "Ligar antes de chegar",
    entregue: false,
  },
  {
    id: 3,
    seq: 3,
    cliente: "Ana Costa",
    endereco: "Rua Nova, 789 - Bairro Alto",
    telefone: "(11) 99876-5432",
    itens: 6,
    instrucoes: "",
    entregue: false,
  },
  {
    id: 4,
    seq: 4,
    cliente: "Pedro Lima",
    endereco: "Tv. do Campo, 33 - Vila Nova",
    telefone: "(11) 95555-1234",
    itens: 1,
    instrucoes: "Documentos sensíveis - cuidado extra",
    entregue: false,
  },
  {
    id: 5,
    seq: 5,
    cliente: "Carla Oliveira",
    endereco: "Alameda Central, 900 - Centro",
    telefone: "(11) 91111-9999",
    itens: 3,
    instrucoes: "Entrega no 5° andar, sala 502",
    entregue: false,
  },
];

export default function RomaneioEntregue() {
  const { perfil } = useAuth();
  const [items, setItems] = useState<RomaneioItem[]>(mockRomaneio);

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const totalItens = items.length;
  const entreguesCount = items.filter((i) => i.entregue).length;
  const progresso = totalItens > 0 ? (entreguesCount / totalItens) * 100 : 0;

  const toggleEntrega = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, entregue: !item.entregue } : item
      )
    );
  };

  return (
    <div className="px-4 py-3 pb-8 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">Romaneio de Hoje</h1>
        <p className="text-sm text-gray-500 capitalize mt-0.5">{dataFormatada}</p>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Total de Entregas</span>
          </div>
          <span className="font-bold text-blue-600">{totalItens}</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5 text-center">
          {entreguesCount} de {totalItens} entregas realizadas ({Math.round(progresso)}%)
        </p>
      </div>

      {/* Delivery List */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Sequência de Entregas</h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-xl transition-all ${
                item.entregue ? "bg-green-50 border border-green-200" : "bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => toggleEntrega(item.id)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    item.entregue
                      ? "bg-green-500 border-green-500"
                      : "border-gray-300 bg-white hover:border-blue-400"
                  }`}
                >
                  {item.entregue && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>

                {/* Sequence Number */}
                <div className="shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      item.entregue
                        ? "bg-green-500 text-white"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {item.seq}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-medium ${
                        item.entregue ? "line-through text-gray-400" : "text-gray-900"
                      }`}
                    >
                      {item.cliente}
                    </p>
                    {!item.entregue && (
                      <ChevronRight size={16} className="text-gray-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <MapPin size={11} />
                    <span className="truncate">{item.endereco}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Phone size={11} />
                    <span>{item.telefone}</span>
                    <span className="mx-1.5 text-gray-300">·</span>
                    <Package size={11} />
                    <span>{item.itens} {item.itens === 1 ? "item" : "itens"}</span>
                  </div>
                  {item.instrucoes && (
                    <div className="flex items-start gap-1 mt-1.5 text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1.5">
                      <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                      <span>{item.instrucoes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

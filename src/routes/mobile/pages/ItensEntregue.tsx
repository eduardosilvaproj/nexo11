import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { MapPin, User, Package, CheckCircle, XCircle, AlertTriangle, PenLine } from "lucide-react";

type ItemStatus = "Entregue" | "Faltante" | "Danificado";

interface DeliveryItem {
  id: number;
  nome: string;
  qtd: number;
  peso: string;
  volume: string;
  status: ItemStatus;
}

interface EntregaData {
  cliente: string;
  endereco: string;
  itens: DeliveryItem[];
}

const mockEntrega: EntregaData = {
  cliente: "Ana Costa",
  endereco: "Rua Nova, 789 - Bairro Alto, São Paulo - SP",
  itens: [
    { id: 1, nome: "Notebook Dell XPS 13", qtd: 1, peso: "1.2 kg", volume: "Pequeno", status: "Entregue" },
    { id: 2, nome: "Mouse Sem Fio Logitech", qtd: 2, peso: "0.3 kg", volume: "Pequeno", status: "Entregue" },
    { id: 3, nome: "Carregador USB-C 65W", qtd: 1, peso: "0.4 kg", volume: "Pequeno", status: "Danificado" },
    { id: 4, nome: "Hub USB-C 7 Portas", qtd: 1, peso: "0.2 kg", volume: "Pequeno", status: "Faltante" },
  ],
};

const statusConfig: Record<ItemStatus, { icon: typeof CheckCircle; bg: string; text: string; label: string }> = {
  Entregue: {
    icon: CheckCircle,
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Entregue",
  },
  Danificado: {
    icon: XCircle,
    bg: "bg-red-100",
    text: "text-red-700",
    label: "Danificado",
  },
  Faltante: {
    icon: AlertTriangle,
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "Faltante",
  },
};

export default function ItensEntregue() {
  const { perfil } = useAuth();
  const [items, setItems] = useState<DeliveryItem[]>(mockEntrega.itens);
  const [notas, setNotas] = useState("");

  const cycleStatus = (id: number) => {
    const order: ItemStatus[] = ["Entregue", "Faltante", "Danificado"];
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const idx = order.indexOf(item.status);
        const next = order[(idx + 1) % order.length];
        return { ...item, status: next };
      })
    );
  };

  return (
    <div className="px-4 py-3 pb-8 space-y-4">
      {/* Delivery Info */}
      <div className="bg-blue-600 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <User size={18} />
          <span className="font-semibold">{mockEntrega.cliente}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={16} className="opacity-80 mt-0.5" />
          <span className="text-sm opacity-90">{mockEntrega.endereco}</span>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Package size={16} className="text-blue-600" />
          Itens da Entrega
          <span className="ml-auto text-xs text-gray-500">{items.length} itens</span>
        </h2>
        <div className="space-y-3">
          {items.map((item) => {
            const st = statusConfig[item.status];
            const StatusIcon = st.icon;
            return (
              <div key={item.id} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-medium text-gray-900">{item.nome}</p>
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                      <span>Qtd: {item.qtd}</span>
                      <span>Peso: {item.peso}</span>
                      <span>Vol: {item.volume}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => cycleStatus(item.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${st.bg} ${st.text}`}
                  >
                    <StatusIcon size={12} />
                    {st.label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signature */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <PenLine size={16} className="text-blue-600" />
          Assinatura do Recebedor
        </h2>
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 h-32 flex flex-col items-center justify-center gap-2">
          <PenLine size={24} className="text-gray-300" />
          <p className="text-xs text-gray-400">
            Toque aqui para capturar assinatura
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Observações</h2>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Adicione qualquer observação sobre a entrega..."
          className="w-full bg-gray-50 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>
    </div>
  );
}

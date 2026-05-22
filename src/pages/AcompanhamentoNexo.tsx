import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Filter
} from "lucide-react";
import { useState } from "react";

const cardStyle: React.CSSProperties = {
  border: "1px solid #E8ECF2",
  borderRadius: "12px",
};

interface MetricCardProps {
  label: string;
  value: string;
  icon: any;
  color: string;
}

function MetricCard({ label, value, icon: Icon, color }: MetricCardProps) {
  return (
    <div
      className="relative bg-white p-5 shadow-sm"
      style={{ ...cardStyle, borderTop: `3px solid ${color}` }}
    >
      <Icon
        className="absolute right-4 top-4"
        style={{ color, width: 20, height: 20 }}
      />
      <p style={{ fontSize: 12, color: "#6B7A90" }}>{label}</p>
      <p
        className="mt-2"
        style={{ fontSize: 24, fontWeight: 500, color: "#0D1117", lineHeight: 1.2 }}
      >
        {value}
      </p>
    </div>
  );
}

export default function AcompanhamentoNexo() {
  const { perfil } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["acompanhamento-nexo-pedidos"],
    queryFn: async () => {
      // Usando dados mockados conforme solicitado, mas preparados para integração real
      return [
        { id: "1024", cliente: "João Silva", status: "Produção", valor: 15400, data: "20/05/2026", prioridade: "Alta" },
        { id: "1025", cliente: "Maria Oliveira", status: "Logística", valor: 8200, data: "21/05/2026", prioridade: "Média" },
        { id: "1026", cliente: "Condomínio Solar", status: "Montagem", valor: 45000, data: "18/05/2026", prioridade: "Alta" },
        { id: "1027", cliente: "Roberto Santos", status: "Finalizado", valor: 12300, data: "15/05/2026", prioridade: "Baixa" },
        { id: "1028", cliente: "Ana Costa", status: "Atrasado", valor: 9800, data: "10/05/2026", prioridade: "Crítica" },
      ];
    }
  });

  const filteredPedidos = pedidos.filter(p => 
    p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "#0D1117", letterSpacing: "-0.01em" }}>
            Acompanhamento NEXO
          </h1>
          <p className="mt-1" style={{ fontSize: 14, color: "#6B7A90" }}>
            Visão operacional e status em tempo real de todos os pedidos.
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Em Produção"
          value="12"
          icon={Package}
          color="#EF9F27"
        />
        <MetricCard
          label="Em Logística"
          value="05"
          icon={Truck}
          color="#1D9E75"
        />
        <MetricCard
          label="Em Montagem"
          value="08"
          icon={LayoutDashboard}
          color="#5DCAA5"
        />
        <MetricCard
          label="Alertas/Atrasos"
          value="02"
          icon={AlertCircle}
          color="#E53935"
        />
      </div>

      <div className="bg-white shadow-sm overflow-hidden" style={cardStyle}>
        <div className="p-4 border-b border-[#E8ECF2] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A90]" />
            <input 
              type="text" 
              placeholder="Buscar pedido por ID ou cliente..."
              className="w-full pl-10 pr-4 py-2 bg-[#F8F9FA] border border-[#E8ECF2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1E6FBF]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E8ECF2] rounded-lg text-sm text-[#6B7A90] hover:bg-gray-50 transition-colors">
              <Filter className="h-4 w-4" />
              Filtrar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA]">
                <th className="px-6 py-3 text-[12px] font-semibold text-[#6B7A90] uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-[12px] font-semibold text-[#6B7A90] uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-[12px] font-semibold text-[#6B7A90] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-[12px] font-semibold text-[#6B7A90] uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-[12px] font-semibold text-[#6B7A90] uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-[12px] font-semibold text-[#6B7A90] uppercase tracking-wider">Prioridade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECF2]">
              {filteredPedidos.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[#0D1117]">#{pedido.id}</td>
                  <td className="px-6 py-4 text-sm text-[#495057]">{pedido.cliente}</td>
                  <td className="px-6 py-4">
                    <span 
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase"
                      style={{ 
                        backgroundColor: 
                          pedido.status === 'Produção' ? '#FAEEDA' : 
                          pedido.status === 'Logística' ? '#EAF3DE' :
                          pedido.status === 'Montagem' ? '#E1F5EE' :
                          pedido.status === 'Finalizado' ? '#E6F3FF' : '#FDE8E8',
                        color: 
                          pedido.status === 'Produção' ? '#633806' : 
                          pedido.status === 'Logística' ? '#27500A' :
                          pedido.status === 'Montagem' ? '#085041' :
                          pedido.status === 'Finalizado' ? '#1E6FBF' : '#C81E1E'
                      }}
                    >
                      {pedido.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#495057]">
                    {pedido.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#6B7A90]">{pedido.data}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${
                        pedido.prioridade === 'Alta' || pedido.prioridade === 'Crítica' ? 'bg-red-500' : 
                        pedido.prioridade === 'Média' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                      <span className="text-sm text-[#495057]">{pedido.prioridade}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPedidos.length === 0 && (
            <div className="p-8 text-center text-[#6B7A90]">
              Nenhum pedido encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { 
  Activity, 
  CreditCard, 
  Wrench, 
  Truck, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Factory, 
  MessageSquare,
  DollarSign,
  Star,
  ShoppingBag,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";

interface Props {
  contratoId: string;
}

type Evento = {
  id: string;
  modulo: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  created_at: string;
  metadata: any;
  usuario_id: string | null;
  entidade_tipo: string | null;
  entidade_id: string | null;
  usuarios_publico?: {
    nome: string;
  };
};

const MODULO_ICONS: Record<string, any> = {
  comercial: ShoppingBag,
  tecnico: Wrench,
  compras: ShoppingBag,
  almoxarifado: Package,
  logistica: Truck,
  montagem: Factory,
  financeiro: DollarSign,
  comissoes: CreditCard,
  pos_venda: Star,
  documentos: FileText,
};

const MODULO_COLORS: Record<string, string> = {
  comercial: "#1E6FBF",
  tecnico: "#534AB7",
  compras: "#993C1D",
  almoxarifado: "#FF7A59",
  logistica: "#12B76A",
  montagem: "#E8A020",
  financeiro: "#05873C",
  comissoes: "#534AB7",
  pos_venda: "#E53935",
  documentos: "#0ea5e9",
};

export function ContratoTimelineTab({ contratoId }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const { roles } = useAuth();
  
  const hasFinanceAccess = canPerform(roles, "financeiro.view");

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["contrato_eventos", contratoId, filter],
    queryFn: async () => {
      let query = supabase
        .from("contrato_eventos" as any)
        .select("*, usuarios_publico(nome)")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("modulo", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filtrar eventos sensíveis se não tiver permissão
      return (data as any[]).filter(e => {
        if (!hasFinanceAccess && (e.modulo === 'financeiro' || e.modulo === 'comissoes')) {
          // Ocultar valores ou o evento inteiro? Por padrão vamos filtrar o evento
          return false;
        }
        return true;
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 w-full animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  const modulos = ["all", "comercial", "tecnico", "almoxarifado", "logistica", "montagem", "financeiro", "pos_venda", "documentos"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {modulos.map(m => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === m 
                ? "bg-slate-900 text-white" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {m === 'all' ? 'Todos' : m.charAt(0).toUpperCase() + m.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {eventos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl py-12 border-2 border-dashed bg-slate-50">
          <Activity className="h-8 w-8 text-slate-300" />
          <span className="text-sm text-slate-500">Este contrato ainda não possui eventos registrados.</span>
        </div>
      ) : (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {eventos.map((evento) => {
            const Icon = MODULO_ICONS[evento.modulo] || Activity;
            const color = MODULO_COLORS[evento.modulo] || "#6B7A90";
            
            return (
              <div key={evento.id} className="relative flex items-start gap-6 pl-4">
                <div 
                  className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200"
                  style={{ color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{evento.titulo}</h4>
                      <Switch 
                        checked={(evento as any).visivel_cliente} 
                        onCheckedChange={async (val) => {
                          const { error } = await supabase
                            .from("contrato_eventos")
                            .update({ visivel_cliente: val })
                            .eq("id", evento.id);
                          if (error) toast.error(error.message);
                          else {
                            toast.success(val ? "Evento liberado no portal" : "Evento ocultado do portal");
                            qc.invalidateQueries({ queryKey: ["contrato_eventos", contratoId] });
                          }
                        }}
                      />
                    </div>
                    <time className="text-[11px] font-medium text-slate-400">
                      {format(new Date(evento.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    </time>
                  </div>
                  {evento.descricao && (
                    <p className="text-sm text-slate-600 leading-relaxed mb-2">{evento.descricao}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <span 
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {evento.modulo}
                    </span>
                    {evento.usuarios_publico?.nome && (
                      <span className="text-[11px] text-slate-400">
                        por {evento.usuarios_publico.nome}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

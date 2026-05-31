import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, UserPlus, Bell } from "lucide-react";

interface Alerta {
  id: string;
  tipo: "atrasado" | "sem_responsavel" | "prazo_proximo";
  mensagem: string;
  contratoId: string;
  clienteNome: string;
  cor: string;
  icone: typeof AlertTriangle;
}

export function TecnicoAlertas() {
  const { perfil } = useAuth();
  const navigate = useNavigate();

  const { data: alertas = [] } = useQuery({
    queryKey: ["tecnico-alertas", perfil?.loja_id],
    queryFn: async () => {
      const { data: contratos } = await supabase
        .from("contratos")
        .select("id, cliente_nome, status, updated_at, medicao_responsavel_id, conferencia_responsavel_id, prazo_entrega")
        .in("status", ["tecnico", "medicao", "conferencia"])
        .eq("loja_id", perfil!.loja_id!);

      const lista = contratos ?? [];
      const hoje = new Date();
      const result: Alerta[] = [];

      lista.forEach(c => {
        const diasParado = Math.ceil((hoje.getTime() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24));

        // Atrasado (>7 dias sem movimentação)
        if (diasParado > 7) {
          result.push({
            id: `atrasado-${c.id}`,
            tipo: "atrasado",
            mensagem: `Parado há ${diasParado} dias`,
            contratoId: c.id,
            clienteNome: c.cliente_nome,
            cor: "text-red-600 bg-red-50 border-red-200",
            icone: AlertTriangle,
          });
        }

        // Sem responsável atribuído
        if (c.status === "tecnico" && !c.medicao_responsavel_id) {
          result.push({
            id: `sem-resp-${c.id}`,
            tipo: "sem_responsavel",
            mensagem: "Sem técnico atribuído",
            contratoId: c.id,
            clienteNome: c.cliente_nome,
            cor: "text-amber-600 bg-amber-50 border-amber-200",
            icone: UserPlus,
          });
        }

        // Prazo de entrega próximo (afeta medição)
        if (c.prazo_entrega) {
          const diasPrazo = Math.ceil((new Date(c.prazo_entrega).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          if (diasPrazo <= 10 && diasPrazo > 0) {
            result.push({
              id: `prazo-${c.id}`,
              tipo: "prazo_proximo",
              mensagem: `Prazo de entrega em ${diasPrazo} dias`,
              contratoId: c.id,
              clienteNome: c.cliente_nome,
              cor: "text-orange-600 bg-orange-50 border-orange-200",
              icone: Clock,
            });
          }
        }
      });

      return result.sort((a, b) => {
        const prioridade = { atrasado: 0, prazo_proximo: 1, sem_responsavel: 2 };
        return (prioridade[a.tipo] ?? 3) - (prioridade[b.tipo] ?? 3);
      });
    },
    enabled: !!perfil?.loja_id,
    staleTime: 60000,
  });

  if (alertas.length === 0) return null;

  return (
    <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2" }}>
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-amber-500" />
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Alertas ({alertas.length})
        </h4>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {alertas.map(a => (
          <div
            key={a.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity ${a.cor}`}
            onClick={() => navigate(`/contratos/${a.contratoId}/medicao`)}
          >
            <a.icone className="h-3.5 w-3.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium truncate block">{a.clienteNome}</span>
              <span className="text-[10px] opacity-80">{a.mensagem}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock, CalendarX, Banknote } from "lucide-react";

interface Props {
  contratoId: string;
  prazoEntrega?: string | null;
  prazoMontagem?: string | null;
  status: string;
  updatedAt: string;
}

interface Alerta {
  tipo: "vencimento" | "prazo" | "parado";
  icone: typeof AlertTriangle;
  cor: string;
  mensagem: string;
}

export function ContratoAlertasCard({ contratoId, prazoEntrega, prazoMontagem, status, updatedAt }: Props) {
  const hoje = new Date().toISOString().slice(0, 10);

  // Parcelas vencidas
  const { data: parcelasVencidas = 0 } = useQuery({
    queryKey: ["contrato_parcelas_vencidas", contratoId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("financeiro_contas_receber")
        .select("*", { count: "exact", head: true })
        .eq("contrato_id", contratoId)
        .eq("status", "pendente")
        .lt("vencimento", hoje);
      if (error) return 0;
      return count || 0;
    },
  });

  // Calcular alertas
  const alertas: Alerta[] = [];

  // Parcelas vencidas
  if (parcelasVencidas > 0) {
    alertas.push({
      tipo: "vencimento",
      icone: Banknote,
      cor: "text-red-600 bg-red-50 border-red-200",
      mensagem: `${parcelasVencidas} parcela${parcelasVencidas > 1 ? "s" : ""} vencida${parcelasVencidas > 1 ? "s" : ""}`,
    });
  }

  // Prazo de entrega
  if (prazoEntrega && status !== "finalizado" && status !== "cancelado") {
    const diff = Math.ceil((new Date(prazoEntrega).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) {
      alertas.push({
        tipo: "prazo",
        icone: CalendarX,
        cor: "text-red-600 bg-red-50 border-red-200",
        mensagem: `Prazo de entrega vencido há ${Math.abs(diff)} dia${Math.abs(diff) > 1 ? "s" : ""}`,
      });
    } else if (diff <= 7) {
      alertas.push({
        tipo: "prazo",
        icone: Clock,
        cor: "text-amber-600 bg-amber-50 border-amber-200",
        mensagem: `Prazo de entrega em ${diff} dia${diff > 1 ? "s" : ""}`,
      });
    }
  }

  // Prazo de montagem
  if (prazoMontagem && status !== "finalizado" && status !== "cancelado") {
    const diff = Math.ceil((new Date(prazoMontagem).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) {
      alertas.push({
        tipo: "prazo",
        icone: CalendarX,
        cor: "text-red-600 bg-red-50 border-red-200",
        mensagem: `Prazo de montagem vencido há ${Math.abs(diff)} dia${Math.abs(diff) > 1 ? "s" : ""}`,
      });
    } else if (diff <= 7) {
      alertas.push({
        tipo: "prazo",
        icone: Clock,
        cor: "text-amber-600 bg-amber-50 border-amber-200",
        mensagem: `Prazo de montagem em ${diff} dia${diff > 1 ? "s" : ""}`,
      });
    }
  }

  // Contrato parado
  if (status !== "finalizado" && status !== "cancelado" && updatedAt) {
    const diasParado = Math.ceil((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (diasParado > 15) {
      alertas.push({
        tipo: "parado",
        icone: Clock,
        cor: "text-orange-600 bg-orange-50 border-orange-200",
        mensagem: `Contrato parado há ${diasParado} dias na etapa atual`,
      });
    }
  }

  if (alertas.length === 0) return null;

  return (
    <div className="space-y-2">
      {alertas.map((a, i) => (
        <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${a.cor}`}>
          <a.icone className="h-4 w-4 flex-shrink-0" />
          <span className="text-xs font-medium">{a.mensagem}</span>
        </div>
      ))}
    </div>
  );
}

// Badge para usar na listagem de contratos
export function ContratoAlertaBadge({ contratoId, prazoEntrega, status, updatedAt }: {
  contratoId: string;
  prazoEntrega?: string | null;
  status: string;
  updatedAt: string;
}) {
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: parcelasVencidas = 0 } = useQuery({
    queryKey: ["contrato_parcelas_vencidas_badge", contratoId],
    queryFn: async () => {
      const { count } = await supabase
        .from("financeiro_contas_receber")
        .select("*", { count: "exact", head: true })
        .eq("contrato_id", contratoId)
        .eq("status", "pendente")
        .lt("vencimento", hoje);
      return count || 0;
    },
    staleTime: 60000,
  });

  let hasAlert = parcelasVencidas > 0;

  if (prazoEntrega && status !== "finalizado" && status !== "cancelado") {
    const diff = Math.ceil((new Date(prazoEntrega).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 7) hasAlert = true;
  }

  if (status !== "finalizado" && status !== "cancelado" && updatedAt) {
    const diasParado = Math.ceil((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (diasParado > 15) hasAlert = true;
  }

  if (!hasAlert) return null;

  return (
    <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-red-500" title="Alerta" />
  );
}

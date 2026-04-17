import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ContratoDetailHeader } from "@/components/contrato/ContratoDetailHeader";
import { ContratoStepper } from "@/components/contrato/ContratoStepper";
import { ContratoFinanceStrip } from "@/components/contrato/ContratoFinanceStrip";
import { ContratoTabs, useContratoTabs } from "@/components/contrato/ContratoTabs";
import { ContratoActivityLog } from "@/components/contrato/ContratoActivityLog";
import { ContratoComercialTab } from "@/components/contrato/ContratoComercialTab";
import { ContratoTecnicoTab } from "@/components/contrato/ContratoTecnicoTab";
import { ContratoProducaoTab } from "@/components/contrato/ContratoProducaoTab";
import { ContratoLogisticaTab } from "@/components/contrato/ContratoLogisticaTab";
import { ContratoMontagemTab } from "@/components/contrato/ContratoMontagemTab";
import { ContratoPosVendaTab } from "@/components/contrato/ContratoPosVendaTab";
import { ContratoDreTab } from "@/components/contrato/ContratoDreTab";

export default function ContratoDetail() {
  const { id } = useParams<{ id: string }>();
  const { active, setActive } = useContratoTabs("comercial");
  const qc = useQueryClient();

  // Carrega contrato + DRE pela view consolidada
  const { data: contrato, isLoading } = useQuery({
    queryKey: ["contrato_dre_view", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_contratos_dre" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Realtime: DRE atualiza sozinho
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`dre-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dre_contrato",
          filter: `contrato_id=eq.${id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["dre", id] });
          qc.invalidateQueries({ queryKey: ["dre-tab", id] });
          qc.invalidateQueries({ queryKey: ["contrato_dre_view", id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  // Realtime: status do contrato (avanço de etapa por outros usuários)
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`contrato-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contratos",
          filter: `id=eq.${id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["contrato_dre_view", id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  async function handleAvancar() {
    if (!id) return;
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc("avancar_contrato" as any, {
      p_contrato_id: id,
      p_usuario_id: userRes.user?.id ?? null,
    });
    if (error) {
      toast.error(error.message ?? "Não foi possível avançar a etapa");
      return;
    }
    const result = data as { ok: boolean; status_novo?: string; erro?: string };
    if (!result?.ok) {
      toast.error(result?.erro ?? "Não foi possível avançar a etapa");
      return;
    }
    toast.success(`Contrato avançado para "${result.status_novo}"`);
    qc.invalidateQueries({ queryKey: ["contrato_dre_view", id] });
    qc.invalidateQueries({ queryKey: ["contrato_logs", id] });
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!contrato) {
    return <div className="p-8 text-sm text-muted-foreground">Contrato não encontrado.</div>;
  }

  return (
    <div className="flex flex-col">
      <ContratoDetailHeader contrato={contrato} onAvancar={handleAvancar} />
      <ContratoStepper current={contrato.status} />
      <ContratoFinanceStrip contratoId={contrato.id} />
      <ContratoTabs active={active} onChange={setActive} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 24,
          padding: "24px 32px",
        }}
      >
        <div>
          {active === "comercial" ? (
            <ContratoComercialTab contrato={contrato} />
          ) : active === "tecnico" ? (
            <ContratoTecnicoTab contratoId={contrato.id} />
          ) : active === "producao" ? (
            <ContratoProducaoTab contratoId={contrato.id} />
          ) : active === "logistica" ? (
            <ContratoLogisticaTab contratoId={contrato.id} />
          ) : active === "montagem" ? (
            <ContratoMontagemTab contratoId={contrato.id} />
          ) : active === "pos_venda" ? (
            <ContratoPosVendaTab contratoId={contrato.id} />
          ) : active === "dre" ? (
            <ContratoDreTab
              contratoId={contrato.id}
              contratoNumero={contrato.id.slice(0, 8)}
              contratoStatus={contrato.status}
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              Conteúdo da aba “{active}” em construção.
            </div>
          )}
        </div>
        <ContratoActivityLog contratoId={contrato.id} />
      </div>
    </div>
  );
}

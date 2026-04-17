import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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

export default function ContratoDetail() {
  const { id } = useParams<{ id: string }>();
  const { active, setActive } = useContratoTabs("comercial");

  const { data: contrato, isLoading } = useQuery({
    queryKey: ["contrato", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!contrato) {
    return <div className="p-8 text-sm text-muted-foreground">Contrato não encontrado.</div>;
  }

  return (
    <div className="flex flex-col">
      <ContratoDetailHeader contrato={contrato} />
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

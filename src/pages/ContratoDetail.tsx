import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ContratoDetailHeader } from "@/components/contrato/ContratoDetailHeader";
import { ContratoStepper } from "@/components/contrato/ContratoStepper";
import { ContratoFinanceStrip } from "@/components/contrato/ContratoFinanceStrip";

export default function ContratoDetail() {
  const { id } = useParams<{ id: string }>();

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
      <div className="p-8 text-sm text-muted-foreground">
        Conteúdo do contrato em construção.
      </div>
    </div>
  );
}

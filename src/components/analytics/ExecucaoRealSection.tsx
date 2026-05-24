import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, MetricTile } from "./SectionCard";
import { IndicadoresVisaoGeral } from "../operacao/IndicadoresVisaoGeral";
import { IndicadoresQualidade } from "../operacao/IndicadoresQualidade";
import { Activity, ShieldCheck } from "lucide-react";

export function ExecucaoRealSection({ lojaId }: { lojaId: string }) {
  // We'll wrap the existing indicators to fit the analytics style
  return (
    <div className="space-y-6">
      <SectionCard 
        title="Execução e Produtividade" 
        description="Métricas baseadas em check-ins reais e tempo em campo."
      >
        <IndicadoresVisaoGeral />
      </SectionCard>

      <SectionCard 
        title="Qualidade e Ocorrências" 
        description="Análise de problemas detectados durante a execução operacional."
      >
        <IndicadoresQualidade />
      </SectionCard>
    </div>
  );
}

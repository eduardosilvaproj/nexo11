import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ContratoMedicaoAmbientesSection } from "./ContratoMedicaoAmbientesSection";
import { ConferenciaAmbientesSection } from "./ConferenciaAmbientesSection";

interface TecnicoTabProps {
  contratoId: string;
}

export function ContratoTecnicoTab({ contratoId }: TecnicoTabProps) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");

  const { data: contrato } = useQuery({
    queryKey: ["contrato-tecnico", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, loja_id")
        .eq("id", contratoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`tecnico-contrato-${contratoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contratos", filter: `id=eq.${contratoId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["contrato-tecnico", contratoId] });
          qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contratoId, qc]);

  return (
    <div className="flex flex-col gap-4">
      {/* Seção 1 — Medição */}
      <ContratoMedicaoAmbientesSection
        contratoId={contratoId}
        lojaId={contrato?.loja_id}
        canEdit={canEdit}
        funcao="medidor"
        titulo="Medição"
      />

      {/* Seção 2 — Conferência */}
      <ConferenciaAmbientesSection contratoId={contratoId} lojaId={contrato?.loja_id} />
    </div>
  );
}

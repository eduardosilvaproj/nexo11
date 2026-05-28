import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PackageCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  contratoId: string;
}

export function ContratoEntradaTab({ contratoId }: Props) {
  const qc = useQueryClient();

  const { data: contrato } = useQuery({
    queryKey: ["contrato_entrada", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, trava_entrada_ok, status")
        .eq("id", contratoId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const recebido = !!contrato?.trava_entrada_ok;

  async function confirmarRecebimento() {
    const { error } = await supabase
      .from("contratos")
      .update({ trava_entrada_ok: true })
      .eq("id", contratoId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Material recebido e conferido. Pronto para montagem.");
    qc.invalidateQueries({ queryKey: ["contrato_entrada", contratoId] });
    qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <PackageCheck className="h-4 w-4 text-slate-600" />
          <h2 className="text-base font-semibold text-slate-900">Entrada de material</h2>
        </div>
        <p className="text-sm text-slate-600">
          Registro de recebimento e conferência do material vindo da fábrica.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {recebido ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Material recebido e conferido</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-amber-700">Aguardando recebimento</span>
              </>
            )}
          </div>
          {!recebido && (
            <Button onClick={confirmarRecebimento} size="sm" style={{ backgroundColor: "#1E6FBF" }}>
              Confirmar recebimento
            </Button>
          )}
          {recebido && <Badge variant="success">Liberado para montagem</Badge>}
        </div>
      </div>
    </div>
  );
}

export default ContratoEntradaTab;

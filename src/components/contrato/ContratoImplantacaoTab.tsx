import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, AlertCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  contratoId: string;
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export function ContratoImplantacaoTab({ contratoId }: Props) {
  const qc = useQueryClient();

  const { data: contrato } = useQuery({
    queryKey: ["contrato_implantacao", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, valor_venda, trava_implantacao_ok, status")
        .eq("id", contratoId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const liberado = !!contrato?.trava_implantacao_ok;

  async function aprovar() {
    const { error } = await supabase
      .from("contratos")
      .update({ trava_implantacao_ok: true })
      .eq("id", contratoId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pagamento à fábrica validado. Pronto para liberar produção.");
    qc.invalidateQueries({ queryKey: ["contrato_implantacao", contratoId] });
    qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-slate-600" />
          <h2 className="text-base font-semibold text-slate-900">Implantação</h2>
        </div>
        <p className="text-sm text-slate-600">
          Validação financeira do pagamento à fábrica antes de iniciar a produção.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500">Valor de venda</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatBRL(Number(contrato?.valor_venda ?? 0))}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Custo estimado fábrica</div>
            <div className="text-lg font-semibold text-slate-900">
              —
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2 text-sm">
            {liberado ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Pagamento validado</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-amber-700">Aguardando validação do financeiro</span>
              </>
            )}
          </div>
          {!liberado && (
            <Button onClick={aprovar} size="sm" style={{ backgroundColor: "#1E6FBF" }}>
              Validar pagamento à fábrica
            </Button>
          )}
          {liberado && <Badge variant="success">Liberado para produção</Badge>}
        </div>
      </div>

      <div className="rounded-xl border bg-amber-50/60 border-amber-200 p-4 flex gap-3 text-sm text-amber-900">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          Esta etapa garante que a fábrica foi paga (ou tem condição de pagamento aprovada)
          antes do contrato entrar em produção.
        </div>
      </div>
    </div>
  );
}

export default ContratoImplantacaoTab;

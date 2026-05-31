import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { useState } from "react";

interface Props {
  contratoId: string;
}

interface Aprovacao {
  id: string;
  etapa_origem: string;
  etapa_destino: string;
  solicitado_por: string;
  aprovado_por: string | null;
  status: string;
  motivo_rejeicao: string | null;
  created_at: string;
  resolved_at: string | null;
}

export function AprovacaoContratoCard({ contratoId }: Props) {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const podeAprovar = canPerform(roles, "contrato.aprovar") ||
    roles.includes("admin") || roles.includes("gerente") || roles.includes("franqueador");
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [rejeitandoId, setRejeitandoId] = useState<string | null>(null);

  const { data: aprovacoes = [] } = useQuery({
    queryKey: ["contrato_aprovacoes", contratoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contrato_aprovacoes")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Aprovacao[];
    },
  });

  const pendentes = aprovacoes.filter(a => a.status === "pendente");
  const historico = aprovacoes.filter(a => a.status !== "pendente");

  async function handleAprovar(id: string, etapaDestino: string) {
    const { error } = await (supabase as any)
      .from("contrato_aprovacoes")
      .update({ status: "aprovado", aprovado_por: user?.id, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }

    // Avançar o contrato
    const { error: err2 } = await supabase
      .from("contratos")
      .update({ status: etapaDestino, aprovacao_pendente: false, aprovado_por: user?.id } as any)
      .eq("id", contratoId);
    if (err2) { toast.error(err2.message); return; }

    toast.success("Aprovado! Contrato avançado para " + etapaDestino);
    qc.invalidateQueries({ queryKey: ["contrato_aprovacoes", contratoId] });
    qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });
  }

  async function handleRejeitar(id: string) {
    if (!motivoRejeicao.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    const { error } = await (supabase as any)
      .from("contrato_aprovacoes")
      .update({ status: "rejeitado", aprovado_por: user?.id, motivo_rejeicao: motivoRejeicao, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }

    await supabase.from("contratos").update({ aprovacao_pendente: false } as any).eq("id", contratoId);

    toast.success("Solicitação rejeitada");
    setRejeitandoId(null);
    setMotivoRejeicao("");
    qc.invalidateQueries({ queryKey: ["contrato_aprovacoes", contratoId] });
    qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });
  }

  function fmtData(s: string) {
    return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function etapaLabel(s: string) {
    const map: Record<string, string> = {
      comercial: "Comercial", medicao: "Medição", conferencia: "Conferência",
      implantacao: "Implantação", producao: "Produção", entrada: "Entrada",
      montagem: "Montagem", pos_venda: "Pós-venda", finalizado: "Finalizado",
    };
    return map[s] || s;
  }

  if (pendentes.length === 0 && historico.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3" style={{ borderColor: pendentes.length > 0 ? "#F59E0B" : "#E8ECF2" }}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-amber-600" />
        <h4 className="text-sm font-semibold text-slate-900">Aprovações</h4>
        {pendentes.length > 0 && (
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            {pendentes.length} pendente{pendentes.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Pendentes */}
      {pendentes.map(a => (
        <div key={a.id} className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">
                {etapaLabel(a.etapa_origem)} → {etapaLabel(a.etapa_destino)}
              </span>
            </div>
            <span className="text-[10px] text-amber-600">{fmtData(a.created_at)}</span>
          </div>

          {podeAprovar && rejeitandoId !== a.id && (
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs" onClick={() => handleAprovar(a.id, a.etapa_destino)}>
                <CheckCircle2 className="h-3 w-3" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" className="gap-1 border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs" onClick={() => setRejeitandoId(a.id)}>
                <XCircle className="h-3 w-3" /> Rejeitar
              </Button>
            </div>
          )}

          {rejeitandoId === a.id && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Motivo da rejeição..."
                value={motivoRejeicao}
                onChange={e => setMotivoRejeicao(e.target.value)}
                className="h-7 text-xs"
              />
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRejeitar(a.id)}>
                Confirmar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setRejeitandoId(null); setMotivoRejeicao(""); }}>
                Cancelar
              </Button>
            </div>
          )}

          {!podeAprovar && (
            <p className="text-xs text-amber-700">Aguardando aprovação do gerente/admin</p>
          )}
        </div>
      ))}

      {/* Histórico */}
      {historico.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
            Histórico ({historico.length})
          </summary>
          <div className="mt-2 space-y-1">
            {historico.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-2 py-1">
                {a.status === "aprovado" ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span className="text-slate-600">
                  {etapaLabel(a.etapa_origem)} → {etapaLabel(a.etapa_destino)}
                </span>
                <span className="text-slate-400">{fmtData(a.resolved_at || a.created_at)}</span>
                {a.motivo_rejeicao && <span className="text-red-500 italic">"{a.motivo_rejeicao}"</span>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

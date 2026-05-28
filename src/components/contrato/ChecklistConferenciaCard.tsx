import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Block, Item, ProgressHeader, AvancarButton, Alerta, formatBRL } from "./GateChecklistShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface Props {
  contratoId: string;
  onAvancado?: () => void;
}

export function ChecklistConferenciaCard({ contratoId, onAvancado }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("admin_master") || hasRole("gerente");
  const canConferente = canManage || hasRole("conferente") || hasRole("tecnico");

  const { data: contrato } = useQuery({
    queryKey: ["gate_conferencia", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, conferencia_responsavel_id, trava_conferencia_ok, conferencia_concluida_em, valor_venda, valor_conferido, conferencia_aprovada_gerente, status")
        .eq("id", contratoId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: ambientes } = useQuery({
    queryKey: ["gate_conferencia_ambientes", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrato_ambientes")
        .select("id, nome, conferencia_status, custo_conferencia")
        .eq("contrato_id", contratoId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [valorEdit, setValorEdit] = useState<string>("");

  const ambArr = ambientes ?? [];
  const totalAmb = ambArr.length;
  const conferidosOk = totalAmb > 0 && ambArr.every(a => a.conferencia_status === "liberada");
  const conferenteAtribuido = !!contrato?.conferencia_responsavel_id;
  const valorVenda = Number(contrato?.valor_venda ?? 0);
  const valorConferido = Number(contrato?.valor_conferido ?? 0);
  const valorConferidoOk = valorConferido > 0;
  const diferenca = valorVenda - valorConferido;
  const margemNegativa = valorConferidoOk && diferenca < 0;
  const aprovadoGerente = !!contrato?.conferencia_aprovada_gerente;
  const concluida = !!contrato?.conferencia_concluida_em;

  const items = [
    { done: conferenteAtribuido, label: "Conferente atribuído ao contrato" },
    { done: conferidosOk, label: `Revisão técnica de todos ambientes (${ambArr.filter(a=>a.conferencia_status==="liberada").length}/${totalAmb})` },
    { done: valorConferidoOk, label: "Valor conferido calculado" },
    { done: concluida, label: "Conferente marcou como concluída" },
    { done: !margemNegativa || aprovadoGerente, label: margemNegativa ? "Aprovação gerencial de margem negativa" : "Margem positiva" },
  ];
  const done = items.filter(i => i.done).length;
  const allDone = done === items.length;

  async function salvarValor() {
    const v = Number(valorEdit.replace(/\./g, "").replace(",", "."));
    if (!v || v <= 0) return toast.error("Valor inválido");
    const { error } = await supabase.from("contratos")
      .update({ valor_conferido: v } as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    toast.success("Valor conferido salvo");
    setValorEdit("");
    qc.invalidateQueries({ queryKey: ["gate_conferencia", contratoId] });
  }

  async function autocalcular() {
    const total = ambArr.reduce((s, a) => s + Number(a.custo_conferencia ?? 0), 0);
    if (total <= 0) return toast.error("Sem custos conferidos nos ambientes");
    const { error } = await supabase.from("contratos")
      .update({ valor_conferido: total } as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    toast.success("Valor conferido calculado automaticamente");
    qc.invalidateQueries({ queryKey: ["gate_conferencia", contratoId] });
  }

  async function marcarConcluida() {
    const { error } = await supabase.from("contratos")
      .update({ conferencia_concluida_em: new Date().toISOString() } as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    toast.success("Conferência marcada como concluída");
    qc.invalidateQueries({ queryKey: ["gate_conferencia", contratoId] });
  }

  async function aprovarMargem() {
    const { error } = await supabase.from("contratos")
      .update({ conferencia_aprovada_gerente: true } as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    toast.success("Margem negativa aprovada");
    qc.invalidateQueries({ queryKey: ["gate_conferencia", contratoId] });
  }

  async function avancar() {
    const { error } = await supabase.from("contratos")
      .update({ trava_conferencia_ok: true } as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    const { data: u } = await supabase.auth.getUser();
    await supabase.rpc("avancar_contrato" as any, { p_contrato_id: contratoId, p_usuario_id: u.user?.id ?? null });
    toast.success("Avançado para Implantação");
    qc.invalidateQueries();
    onAvancado?.();
  }

  return (
    <div className="flex flex-col gap-4">
      <ProgressHeader title="Checklist de Conferência" subtitle="Itens obrigatórios para avançar para Implantação" done={done} total={items.length} />

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-xs text-[#6B7A90]">Valor de venda</div>
            <div className="text-lg font-semibold text-[#0D1117]">{formatBRL(valorVenda)}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7A90]">Valor conferido</div>
            <div className="text-lg font-semibold text-[#0D1117]">{valorConferidoOk ? formatBRL(valorConferido) : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7A90]">Diferença</div>
            <div className={`text-lg font-semibold ${margemNegativa ? "text-red-600" : "text-emerald-600"}`}>
              {valorConferidoOk ? formatBRL(diferenca) : "—"}
            </div>
          </div>
        </div>
        {canConferente && (
          <div className="flex gap-2 items-center flex-wrap">
            <Input placeholder="Informar valor conferido (R$)" value={valorEdit}
              onChange={(e) => setValorEdit(e.target.value)} className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={salvarValor}>Salvar</Button>
            <Button variant="ghost" size="sm" onClick={autocalcular}>Calcular pelos ambientes</Button>
          </div>
        )}
        {margemNegativa && (
          <div className="mt-3">
            <Alerta tone="error">
              Margem negativa — requer aprovação do gerente.
              {!aprovadoGerente && canManage && (
                <Button size="sm" variant="outline" onClick={aprovarMargem} className="ml-3">
                  Aprovar avanço com margem negativa
                </Button>
              )}
              {aprovadoGerente && <span className="ml-2 font-medium">✓ Aprovado</span>}
            </Alerta>
          </div>
        )}
      </div>

      <Block title="Validação" doneCount={done} totalCount={items.length}>
        {items.map((it, i) => <Item key={i} {...it} />)}
      </Block>

      <div className="flex flex-wrap gap-2 items-center justify-between rounded-xl border border-[#E8ECF2] bg-white p-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/contratos/${contratoId}/conferencia`)}>
            Abrir conferência
          </Button>
          {canConferente && !concluida && conferidosOk && valorConferidoOk && (
            <Button variant="outline" size="sm" onClick={marcarConcluida}>
              Marcar conferência como concluída
            </Button>
          )}
        </div>
        <AvancarButton enabled={allDone && canManage} label="Avançar para Implantação" onClick={avancar} />
      </div>
    </div>
  );
}

export default ChecklistConferenciaCard;

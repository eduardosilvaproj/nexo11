import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Block, Item, ProgressHeader, AvancarButton, Alerta } from "./GateChecklistShared";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props { contratoId: string; onAvancado?: () => void; }

const PESQUISA_OPCOES = [
  { value: "pendente", label: "Pendente" },
  { value: "enviada", label: "Enviada" },
  { value: "respondida", label: "Respondida" },
];

export function ChecklistPosVendaCard({ contratoId, onAvancado }: Props) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("admin_master") || hasRole("gerente");

  const { data: c } = useQuery({
    queryKey: ["gate_posvenda", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, posvenda_pesquisa_status, posvenda_aprovado, status")
        .eq("id", contratoId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: chamados } = useQuery({
    queryKey: ["gate_posvenda_chamados", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados_pos_venda")
        .select("id, tipo, descricao, status")
        .eq("contrato_id", contratoId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const abertos = (chamados ?? []).filter((c: any) => c.status !== "fechado" && c.status !== "resolvido");
  const pesquisaStatus = c?.posvenda_pesquisa_status ?? "pendente";
  const pesquisaOk = pesquisaStatus === "enviada" || pesquisaStatus === "respondida";
  const semPendencias = abertos.length === 0;
  const aprovadoOk = !!c?.posvenda_aprovado;
  const finalizado = c?.status === "finalizado" || c?.status === "concluido";

  const items = [
    { done: pesquisaOk, label: "Pesquisa de satisfação enviada ao cliente" },
    { done: semPendencias, label: "Sem reclamações abertas" },
    { done: aprovadoOk, label: "Gerente aprovou finalização" },
  ];
  const done = items.filter(i => i.done).length;
  const allDone = done === items.length;

  async function update(patch: Record<string, unknown>) {
    const { error } = await supabase.from("contratos").update(patch as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["gate_posvenda", contratoId] });
  }

  async function aprovar() {
    await update({ posvenda_aprovado: true });
    toast.success("Finalização aprovada pelo gerente");
  }

  async function finalizar() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.rpc("avancar_contrato" as any, { p_contrato_id: contratoId, p_usuario_id: u.user?.id ?? null });
    if (error) return toast.error(error.message);
    toast.success("Contrato finalizado");
    qc.invalidateQueries();
    onAvancado?.();
  }

  return (
    <div className="flex flex-col gap-4">
      <ProgressHeader title="Checklist de Pós-venda" subtitle="Validação final antes de encerrar o contrato" done={done} total={items.length} />

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
        <div className="text-xs text-[#6B7A90] mb-1">Status da pesquisa de satisfação</div>
        <Select value={pesquisaStatus} onValueChange={(v) => update({ posvenda_pesquisa_status: v })} disabled={!canManage}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">
            {PESQUISA_OPCOES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
        <div className="text-sm font-medium text-[#0D1117] mb-2">Pendências e reclamações</div>
        {abertos.length === 0 ? (
          <div className="text-sm text-[#05873C]">Nenhuma pendência aberta</div>
        ) : (
          <div className="flex flex-col gap-2">
            {abertos.map((ch: any) => (
              <div key={ch.id} className="text-sm border border-amber-200 bg-amber-50 rounded-lg p-2">
                <div className="font-medium text-amber-900">{ch.tipo ?? "Chamado"} — {ch.status}</div>
                <div className="text-xs text-amber-800">{ch.descricao}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!semPendencias && (
        <Alerta tone="error">Resolva todas as pendências antes de finalizar o contrato.</Alerta>
      )}

      <Block title="Validações" doneCount={done} totalCount={items.length}>
        {items.map((it, i) => <Item key={i} {...it} />)}
      </Block>

      <div className="flex justify-between items-center rounded-xl border border-[#E8ECF2] bg-white p-4">
        {!aprovadoOk && canManage ? (
          <Button size="sm" variant="outline" onClick={aprovar} disabled={!pesquisaOk || !semPendencias}>
            Aprovar finalização
          </Button>
        ) : <span />}
        <AvancarButton enabled={allDone && canManage && !finalizado} label={finalizado ? "Contrato finalizado" : "Finalizar contrato"} onClick={finalizar} />
      </div>
    </div>
  );
}

export default ChecklistPosVendaCard;

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Block, Item, ProgressHeader, AvancarButton, Alerta, formatBRL } from "./GateChecklistShared";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  contratoId: string;
  onAvancado?: () => void;
}

const STATUS_OPCOES: { value: string; label: string }[] = [
  { value: "aguardando", label: "Aguardando envio" },
  { value: "enviado", label: "Pedido enviado" },
  { value: "pago", label: "Pago" },
  { value: "validado", label: "Validado pelo financeiro" },
];

export function ChecklistImplantacaoCard({ contratoId, onAvancado }: Props) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const canManage = hasRole("admin") || hasRole("admin_master") || hasRole("gerente");
  const canFinance = canManage || hasRole("financeiro");

  const { data: contrato } = useQuery({
    queryKey: ["gate_implantacao", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, valor_venda, trava_implantacao_ok, pedido_fabrica_status, comprovante_fabrica_url, status")
        .eq("id", contratoId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const statusPedido = contrato?.pedido_fabrica_status ?? "aguardando";
  const comprovanteOk = !!contrato?.comprovante_fabrica_url;
  const enviado = ["enviado", "pago", "validado"].includes(statusPedido);
  const validado = statusPedido === "validado" || !!contrato?.trava_implantacao_ok;

  const items = [
    { done: enviado, label: "Pedido enviado à fábrica" },
    { done: comprovanteOk, label: "Comprovante de pagamento anexado" },
    { done: validado, label: "Financeiro validou o pagamento" },
  ];
  const done = items.filter(i => i.done).length;
  const allDone = done === items.length;

  async function setStatus(v: string) {
    const { error } = await supabase.from("contratos")
      .update({ pedido_fabrica_status: v } as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["gate_implantacao", contratoId] });
  }

  async function uploadComprovante(file: File) {
    const path = `${contratoId}/comprovante-fabrica-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("contrato-comercial").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data: signed } = await supabase.storage.from("contrato-comercial").createSignedUrl(path, 60 * 60 * 24 * 365);
    const url = signed?.signedUrl ?? path;
    const { error } = await supabase.from("contratos")
      .update({ comprovante_fabrica_url: url, pedido_fabrica_status: statusPedido === "aguardando" ? "pago" : statusPedido } as any)
      .eq("id", contratoId);
    if (error) return toast.error(error.message);
    toast.success("Comprovante anexado");
    qc.invalidateQueries({ queryKey: ["gate_implantacao", contratoId] });
  }

  async function validarPagamento() {
    const { error } = await supabase.from("contratos")
      .update({ trava_implantacao_ok: true, pedido_fabrica_status: "validado" } as any)
      .eq("id", contratoId);
    if (error) return toast.error(error.message);
    toast.success("Pagamento validado pelo financeiro");
    qc.invalidateQueries({ queryKey: ["gate_implantacao", contratoId] });
  }

  async function avancar() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.rpc("avancar_contrato" as any, { p_contrato_id: contratoId, p_usuario_id: u.user?.id ?? null });
    if (error) return toast.error(error.message);
    toast.success("Avançado para Produção");
    qc.invalidateQueries();
    onAvancado?.();
  }

  return (
    <div className="flex flex-col gap-4">
      <ProgressHeader title="Checklist de Implantação" subtitle="Validação financeira antes de liberar produção" done={done} total={items.length} />

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[#6B7A90]">Valor de venda</div>
            <div className="text-lg font-semibold text-[#0D1117]">{formatBRL(Number(contrato?.valor_venda ?? 0))}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7A90] mb-1">Status do pedido</div>
            {canManage ? (
              <Select value={statusPedido} onValueChange={setStatus}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  {STATUS_OPCOES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm font-medium">{STATUS_OPCOES.find(o => o.value === statusPedido)?.label}</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#F2F5F9]">
          <div className="flex items-center gap-2 text-sm">
            <FileText size={16} className="text-[#6B7A90]" />
            {comprovanteOk ? (
              <a href={contrato.comprovante_fabrica_url} target="_blank" rel="noreferrer" className="text-[#1E6FBF] underline">Comprovante anexado</a>
            ) : (
              <span className="text-[#6B7A90]">Nenhum comprovante anexado</span>
            )}
          </div>
          <input type="file" ref={fileRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadComprovante(f); }} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload size={14} className="mr-2" /> {comprovanteOk ? "Substituir" : "Anexar comprovante"}
          </Button>
        </div>
      </div>

      <Block title="Validação" doneCount={done} totalCount={items.length}>
        {items.map((it, i) => <Item key={i} {...it} />)}
      </Block>

      {!validado && comprovanteOk && enviado && !canFinance && (
        <Alerta>Aguardando validação do financeiro.</Alerta>
      )}

      <div className="flex flex-wrap gap-2 items-center justify-between rounded-xl border border-[#E8ECF2] bg-white p-4">
        {canFinance && !validado && comprovanteOk && enviado ? (
          <Button onClick={validarPagamento} size="sm" className="bg-[#1E6FBF] hover:bg-[#1759A0] text-white">
            Validar pagamento à fábrica
          </Button>
        ) : <span />}
        <AvancarButton enabled={allDone && canManage} label="Avançar para Produção" onClick={avancar} />
      </div>
    </div>
  );
}

export default ChecklistImplantacaoCard;

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Block, Item, ProgressHeader, AvancarButton } from "./GateChecklistShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText } from "lucide-react";

interface Props { contratoId: string; onAvancado?: () => void; }

const STATUS = [
  { value: "aguardando", label: "Aguardando início" },
  { value: "em_producao", label: "Em produção" },
  { value: "concluida", label: "Concluída" },
];

export function ChecklistProducaoCard({ contratoId, onAvancado }: Props) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const canManage = hasRole("admin") || hasRole("admin_master") || hasRole("gerente");

  const { data: c } = useQuery({
    queryKey: ["gate_producao", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, producao_status, producao_previsao_entrega, producao_nf_url, trava_producao_ok")
        .eq("id", contratoId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const status = c?.producao_status ?? "aguardando";
  const previsaoOk = !!c?.producao_previsao_entrega;
  const nfOk = !!c?.producao_nf_url;
  const concluida = status === "concluida" || !!c?.trava_producao_ok;

  const items = [
    { done: previsaoOk, label: "Data de previsão de entrega informada" },
    { done: concluida, label: "Produção marcada como concluída" },
    { done: nfOk, label: "Nota fiscal da fábrica anexada" },
  ];
  const done = items.filter(i => i.done).length;
  const allDone = done === items.length;

  async function update(patch: Record<string, unknown>) {
    const { error } = await supabase.from("contratos").update(patch as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["gate_producao", contratoId] });
  }

  async function uploadNF(file: File) {
    const path = `${contratoId}/nf-fabrica-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("contrato-comercial").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data: signed } = await supabase.storage.from("contrato-comercial").createSignedUrl(path, 60 * 60 * 24 * 365);
    await update({ producao_nf_url: signed?.signedUrl ?? path });
    toast.success("NF anexada");
  }

  async function marcarConcluida() {
    await update({ producao_status: "concluida", trava_producao_ok: true });
    toast.success("Produção concluída");
  }

  async function avancar() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.rpc("avancar_contrato" as any, { p_contrato_id: contratoId, p_usuario_id: u.user?.id ?? null });
    if (error) return toast.error(error.message);
    toast.success("Avançado para Entrada");
    qc.invalidateQueries();
    onAvancado?.();
  }

  return (
    <div className="flex flex-col gap-4">
      <ProgressHeader title="Checklist de Produção" subtitle="Acompanhamento da produção até liberação para entrada" done={done} total={items.length} />

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-[#6B7A90] mb-1">Status</div>
          <Select value={status} onValueChange={(v) => update({ producao_status: v, ...(v === "concluida" ? { trava_producao_ok: true } : {}) })} disabled={!canManage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent position="popper">
              {STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-[#6B7A90] mb-1">Previsão de entrega</div>
          <Input type="date" value={c?.producao_previsao_entrega ?? ""} onChange={(e) => update({ producao_previsao_entrega: e.target.value || null })} disabled={!canManage} />
        </div>
        <div className="flex flex-col">
          <div className="text-xs text-[#6B7A90] mb-1">Nota fiscal</div>
          <div className="flex items-center gap-2">
            {nfOk ? (
              <a href={c.producao_nf_url} target="_blank" rel="noreferrer" className="text-sm text-[#1E6FBF] underline flex items-center gap-1">
                <FileText size={14} /> Ver NF
              </a>
            ) : <span className="text-sm text-[#6B7A90]">Não anexada</span>}
            <input type="file" ref={fileRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadNF(f); }} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={14} className="mr-1" /> {nfOk ? "Trocar" : "Anexar"}
            </Button>
          </div>
        </div>
      </div>

      <Block title="Validações" doneCount={done} totalCount={items.length}>
        {items.map((it, i) => <Item key={i} {...it} />)}
      </Block>

      <div className="flex justify-between items-center rounded-xl border border-[#E8ECF2] bg-white p-4">
        {!concluida && canManage ? (
          <Button size="sm" variant="outline" onClick={marcarConcluida}>Marcar produção concluída</Button>
        ) : <span />}
        <AvancarButton enabled={allDone && canManage} label="Avançar para Entrada" onClick={avancar} />
      </div>
    </div>
  );
}

export default ChecklistProducaoCard;

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Block, Item, ProgressHeader, AvancarButton, Alerta } from "./GateChecklistShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Image as ImageIcon, X } from "lucide-react";

interface Props { contratoId: string; onAvancado?: () => void; }

const AVARIA_STATUS = [
  { value: "registrada", label: "Registrada" },
  { value: "reclamada", label: "Reclamada à fábrica" },
  { value: "resolvida", label: "Resolvida" },
];

export function ChecklistEntradaCard({ contratoId, onAvancado }: Props) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const fotosRef = useRef<HTMLInputElement>(null);
  const avariaFotoRef = useRef<HTMLInputElement>(null);
  const canManage = hasRole("admin") || hasRole("admin_master") || hasRole("gerente") || hasRole("conferente");

  const { data: c } = useQuery({
    queryKey: ["gate_entrada", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, entrada_data_recebimento, entrada_volumes_esperados, entrada_volumes_recebidos, entrada_fotos_urls, entrada_tem_avaria, entrada_avaria_descricao, entrada_avaria_foto_url, entrada_avaria_status, trava_entrada_ok")
        .eq("id", contratoId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const fotos: string[] = Array.isArray(c?.entrada_fotos_urls) ? c.entrada_fotos_urls : [];
  const dataOk = !!c?.entrada_data_recebimento;
  const volEsperados = Number(c?.entrada_volumes_esperados ?? 0);
  const volRecebidos = Number(c?.entrada_volumes_recebidos ?? 0);
  const volumesOk = volEsperados > 0 && volRecebidos === volEsperados;
  const fotosOk = fotos.length > 0;
  const temAvaria = !!c?.entrada_tem_avaria;
  const avariaOk = !temAvaria || (!!c?.entrada_avaria_descricao && !!c?.entrada_avaria_status);
  const liberado = !!c?.trava_entrada_ok;

  const items = [
    { done: dataOk, label: "Data de recebimento informada" },
    { done: volumesOk, label: "Conferência de volumes (recebidos = esperados)" },
    { done: fotosOk, label: "Fotos do material anexadas" },
    { done: avariaOk, label: temAvaria ? "Avaria registrada com descrição e status" : "Checklist de avaria preenchido" },
    { done: liberado, label: "Responsável liberou para montagem" },
  ];
  const done = items.filter(i => i.done).length;
  const allDone = done === items.length;

  async function update(patch: Record<string, unknown>) {
    const { error } = await supabase.from("contratos").update(patch as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["gate_entrada", contratoId] });
  }

  async function uploadFotos(files: FileList) {
    const novas: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${contratoId}/entrada-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("contrato-comercial").upload(path, file, { upsert: true });
      if (upErr) { toast.error(upErr.message); continue; }
      const { data: signed } = await supabase.storage.from("contrato-comercial").createSignedUrl(path, 60 * 60 * 24 * 365);
      novas.push(signed?.signedUrl ?? path);
    }
    if (novas.length) {
      await update({ entrada_fotos_urls: [...fotos, ...novas] });
      toast.success(`${novas.length} foto(s) anexada(s)`);
    }
  }

  async function removerFoto(url: string) {
    await update({ entrada_fotos_urls: fotos.filter(u => u !== url) });
  }

  async function uploadAvariaFoto(file: File) {
    const path = `${contratoId}/avaria-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("contrato-comercial").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data: signed } = await supabase.storage.from("contrato-comercial").createSignedUrl(path, 60 * 60 * 24 * 365);
    await update({ entrada_avaria_foto_url: signed?.signedUrl ?? path });
    toast.success("Foto da avaria anexada");
  }

  async function liberar() {
    await update({ trava_entrada_ok: true });
    toast.success("Material liberado para montagem");
  }

  async function avancar() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.rpc("avancar_contrato" as any, { p_contrato_id: contratoId, p_usuario_id: u.user?.id ?? null });
    if (error) return toast.error(error.message);
    toast.success("Avançado para Montagem");
    qc.invalidateQueries();
    onAvancado?.();
  }

  return (
    <div className="flex flex-col gap-4">
      <ProgressHeader title="Checklist de Entrada" subtitle="Recebimento e conferência do material da fábrica" done={done} total={items.length} />

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-[#6B7A90] mb-1">Data de recebimento</div>
          <Input type="date" value={c?.entrada_data_recebimento ?? ""} onChange={(e) => update({ entrada_data_recebimento: e.target.value || null })} disabled={!canManage} />
        </div>
        <div>
          <div className="text-xs text-[#6B7A90] mb-1">Volumes esperados</div>
          <Input type="number" min={0} value={volEsperados} onChange={(e) => update({ entrada_volumes_esperados: Number(e.target.value) || 0 })} disabled={!canManage} />
        </div>
        <div>
          <div className="text-xs text-[#6B7A90] mb-1">Volumes recebidos</div>
          <Input type="number" min={0} value={volRecebidos} onChange={(e) => update({ entrada_volumes_recebidos: Number(e.target.value) || 0 })} disabled={!canManage} />
        </div>
      </div>

      {volEsperados > 0 && volRecebidos !== volEsperados && (
        <Alerta tone="error">Divergência: recebidos {volRecebidos} de {volEsperados} esperados.</Alerta>
      )}

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-[#0D1117]">Fotos do material recebido</div>
          <input type="file" ref={fotosRef} className="hidden" multiple accept="image/*" onChange={(e) => { if (e.target.files?.length) uploadFotos(e.target.files); }} />
          <Button variant="outline" size="sm" onClick={() => fotosRef.current?.click()} disabled={!canManage}>
            <Upload size={14} className="mr-1" /> Anexar fotos
          </Button>
        </div>
        {fotos.length === 0 ? (
          <div className="text-sm text-[#6B7A90] flex items-center gap-2"><ImageIcon size={14} /> Nenhuma foto anexada</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fotos.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-[#E8ECF2]" />
                {canManage && (
                  <button onClick={() => removerFoto(url)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium text-[#0D1117]">Há avarias no material?</div>
            <div className="text-xs text-[#6B7A90]">Marque se houver itens danificados</div>
          </div>
          <Switch checked={temAvaria} onCheckedChange={(v) => update({ entrada_tem_avaria: v })} disabled={!canManage} />
        </div>
        {temAvaria && (
          <div className="flex flex-col gap-3 pt-3 border-t border-[#F2F5F9]">
            <div>
              <div className="text-xs text-[#6B7A90] mb-1">Descrição da avaria</div>
              <Textarea value={c?.entrada_avaria_descricao ?? ""} onChange={(e) => update({ entrada_avaria_descricao: e.target.value })} disabled={!canManage} rows={3} placeholder="Descreva o que está avariado..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[#6B7A90] mb-1">Status da reclamação</div>
                <Select value={c?.entrada_avaria_status ?? ""} onValueChange={(v) => update({ entrada_avaria_status: v })} disabled={!canManage}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent position="popper">
                    {AVARIA_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-[#6B7A90] mb-1">Foto da avaria</div>
                <div className="flex items-center gap-2">
                  {c?.entrada_avaria_foto_url ? (
                    <a href={c.entrada_avaria_foto_url} target="_blank" rel="noreferrer" className="text-sm text-[#1E6FBF] underline">Ver foto</a>
                  ) : <span className="text-sm text-[#6B7A90]">Não anexada</span>}
                  <input type="file" ref={avariaFotoRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvariaFoto(f); }} />
                  <Button variant="outline" size="sm" onClick={() => avariaFotoRef.current?.click()} disabled={!canManage}>
                    <Upload size={14} className="mr-1" /> Anexar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Block title="Validações" doneCount={done} totalCount={items.length}>
        {items.map((it, i) => <Item key={i} {...it} />)}
      </Block>

      <div className="flex justify-between items-center rounded-xl border border-[#E8ECF2] bg-white p-4">
        {!liberado && canManage ? (
          <Button size="sm" variant="outline" onClick={liberar} disabled={!dataOk || !volumesOk || !fotosOk || !avariaOk}>
            Liberar para montagem
          </Button>
        ) : <span />}
        <AvancarButton enabled={allDone && canManage} label="Avançar para Montagem" onClick={avancar} />
      </div>
    </div>
  );
}

export default ChecklistEntradaCard;

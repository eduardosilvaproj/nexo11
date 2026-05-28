import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Block, Item, ProgressHeader, AvancarButton } from "./GateChecklistShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Image as ImageIcon, X, FileSignature } from "lucide-react";

interface Props { contratoId: string; onAvancado?: () => void; }

export function ChecklistMontagemCard({ contratoId, onAvancado }: Props) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const antesRef = useRef<HTMLInputElement>(null);
  const depoisRef = useRef<HTMLInputElement>(null);
  const aceiteRef = useRef<HTMLInputElement>(null);
  const canManage = hasRole("admin") || hasRole("admin_master") || hasRole("gerente") || hasRole("montador");

  const { data: c } = useQuery({
    queryKey: ["gate_montagem", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, montagem_data_inicio, montagem_data_conclusao, montagem_fotos_antes, montagem_fotos_depois, montagem_aceite_cliente_url, montagem_concluida, trava_montagem_ok")
        .eq("id", contratoId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: agend } = useQuery({
    queryKey: ["gate_montagem_agend", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos_montagem")
        .select("id, equipe_id, equipes:equipe_id ( id, nome )")
        .eq("contrato_id", contratoId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const antes: string[] = Array.isArray(c?.montagem_fotos_antes) ? c.montagem_fotos_antes : [];
  const depois: string[] = Array.isArray(c?.montagem_fotos_depois) ? c.montagem_fotos_depois : [];
  const equipes = (agend ?? []).filter((a: any) => a.equipe_id);
  const montadorOk = equipes.length > 0;
  const inicioOk = !!c?.montagem_data_inicio;
  const fimOk = !!c?.montagem_data_conclusao;
  const fotosOk = antes.length > 0 && depois.length > 0;
  const aceiteOk = !!c?.montagem_aceite_cliente_url;
  const concluidaOk = !!c?.montagem_concluida || !!c?.trava_montagem_ok;

  const items = [
    { done: montadorOk, label: "Montador(es) atribuído(s) ao contrato" },
    { done: inicioOk, label: "Data de início informada" },
    { done: fimOk, label: "Data de conclusão informada" },
    { done: fotosOk, label: "Fotos antes e depois anexadas" },
    { done: aceiteOk, label: "Termo de aceite assinado pelo cliente" },
    { done: concluidaOk, label: "Montador marcou como concluída" },
  ];
  const done = items.filter(i => i.done).length;
  const allDone = done === items.length;

  async function update(patch: Record<string, unknown>) {
    const { error } = await supabase.from("contratos").update(patch as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["gate_montagem", contratoId] });
  }

  async function uploadFotos(files: FileList, campo: "montagem_fotos_antes" | "montagem_fotos_depois") {
    const atual = campo === "montagem_fotos_antes" ? antes : depois;
    const novas: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${contratoId}/${campo}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("contrato-comercial").upload(path, file, { upsert: true });
      if (upErr) { toast.error(upErr.message); continue; }
      const { data: signed } = await supabase.storage.from("contrato-comercial").createSignedUrl(path, 60 * 60 * 24 * 365);
      novas.push(signed?.signedUrl ?? path);
    }
    if (novas.length) {
      await update({ [campo]: [...atual, ...novas] });
      toast.success(`${novas.length} foto(s) anexada(s)`);
    }
  }

  async function removerFoto(url: string, campo: "montagem_fotos_antes" | "montagem_fotos_depois") {
    const atual = campo === "montagem_fotos_antes" ? antes : depois;
    await update({ [campo]: atual.filter(u => u !== url) });
  }

  async function uploadAceite(file: File) {
    const path = `${contratoId}/aceite-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("contrato-comercial").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data: signed } = await supabase.storage.from("contrato-comercial").createSignedUrl(path, 60 * 60 * 24 * 365);
    await update({ montagem_aceite_cliente_url: signed?.signedUrl ?? path });
    toast.success("Aceite anexado");
  }

  async function concluir() {
    await update({ montagem_concluida: true, trava_montagem_ok: true });
    toast.success("Montagem concluída");
  }

  async function avancar() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.rpc("avancar_contrato" as any, { p_contrato_id: contratoId, p_usuario_id: u.user?.id ?? null });
    if (error) return toast.error(error.message);
    toast.success("Avançado para Pós-venda");
    qc.invalidateQueries();
    onAvancado?.();
  }

  const FotoGrid = ({ urls, campo }: { urls: string[]; campo: "montagem_fotos_antes" | "montagem_fotos_depois" }) => (
    urls.length === 0 ? (
      <div className="text-sm text-[#6B7A90] flex items-center gap-2"><ImageIcon size={14} /> Nenhuma foto anexada</div>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {urls.map((url, i) => (
          <div key={i} className="relative group">
            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-[#E8ECF2]" />
            {canManage && (
              <button onClick={() => removerFoto(url, campo)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="flex flex-col gap-4">
      <ProgressHeader title="Checklist de Montagem" subtitle="Execução da montagem e aceite do cliente" done={done} total={items.length} />

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
        <div className="text-sm font-medium text-[#0D1117] mb-2">Equipe(s) atribuída(s)</div>
        {equipes.length === 0 ? (
          <div className="text-sm text-[#6B7A90]">Nenhuma equipe atribuída — crie um agendamento na aba Montagem</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {equipes.map((a: any) => (
              <span key={a.id} className="text-xs px-2 py-1 rounded-full bg-[#E6F3FF] text-[#1E6FBF] font-medium">
                {a.equipes?.nome ?? "Equipe"}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-[#6B7A90] mb-1">Data de início</div>
          <Input type="date" value={c?.montagem_data_inicio ?? ""} onChange={(e) => update({ montagem_data_inicio: e.target.value || null })} disabled={!canManage} />
        </div>
        <div>
          <div className="text-xs text-[#6B7A90] mb-1">Data de conclusão</div>
          <Input type="date" value={c?.montagem_data_conclusao ?? ""} onChange={(e) => update({ montagem_data_conclusao: e.target.value || null })} disabled={!canManage} />
        </div>
      </div>

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-[#0D1117]">Fotos — antes</div>
          <input type="file" ref={antesRef} className="hidden" multiple accept="image/*" onChange={(e) => { if (e.target.files?.length) uploadFotos(e.target.files, "montagem_fotos_antes"); }} />
          <Button variant="outline" size="sm" onClick={() => antesRef.current?.click()} disabled={!canManage}>
            <Upload size={14} className="mr-1" /> Anexar
          </Button>
        </div>
        <FotoGrid urls={antes} campo="montagem_fotos_antes" />
      </div>

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-[#0D1117]">Fotos — depois</div>
          <input type="file" ref={depoisRef} className="hidden" multiple accept="image/*" onChange={(e) => { if (e.target.files?.length) uploadFotos(e.target.files, "montagem_fotos_depois"); }} />
          <Button variant="outline" size="sm" onClick={() => depoisRef.current?.click()} disabled={!canManage}>
            <Upload size={14} className="mr-1" /> Anexar
          </Button>
        </div>
        <FotoGrid urls={depois} campo="montagem_fotos_depois" />
      </div>

      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <FileSignature size={16} className="text-[#6B7A90]" />
            {aceiteOk ? (
              <a href={c.montagem_aceite_cliente_url} target="_blank" rel="noreferrer" className="text-[#1E6FBF] underline">Termo de aceite assinado</a>
            ) : <span className="text-[#6B7A90]">Aceite do cliente não anexado</span>}
          </div>
          <input type="file" ref={aceiteRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAceite(f); }} />
          <Button variant="outline" size="sm" onClick={() => aceiteRef.current?.click()} disabled={!canManage}>
            <Upload size={14} className="mr-1" /> {aceiteOk ? "Substituir" : "Anexar"}
          </Button>
        </div>
      </div>

      <Block title="Validações" doneCount={done} totalCount={items.length}>
        {items.map((it, i) => <Item key={i} {...it} />)}
      </Block>

      <div className="flex justify-between items-center rounded-xl border border-[#E8ECF2] bg-white p-4">
        {!concluidaOk && canManage ? (
          <Button size="sm" variant="outline" onClick={concluir} disabled={!inicioOk || !fimOk || !fotosOk}>
            Concluir montagem
          </Button>
        ) : <span />}
        <AvancarButton enabled={allDone && canManage} label="Avançar para Pós-venda" onClick={avancar} />
      </div>
    </div>
  );
}

export default ChecklistMontagemCard;

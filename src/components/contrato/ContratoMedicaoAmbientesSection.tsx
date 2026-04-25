import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Image as ImageIcon, FileText, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PhotoAnnotationViewer } from "@/components/tecnico/PhotoAnnotationViewer";
import { cn } from "@/lib/utils";

type StatusMed = "pendente" | "agendado" | "concluido" | "pago";
type Funcao = "medidor" | "conferente" | "montador";

interface AmbienteRow {
  id: string;
  nome: string;
  valor_liquido: number;
  medicao_fotos: any[];
  medicao_scan_url: string;
  medicao_concluido: boolean;
  observacoes: string;
  [key: string]: any;
}

interface PessoaOpt {
  id: string;
  nome: string;
  percentual_padrao: number;
}

const STATUS_STYLE: Record<StatusMed, { bg: string; color: string; label: string }> = {
  pendente: { bg: "#F1F3F7", color: "#6B7A90", label: "Pendente" },
  agendado: { bg: "#E3F0FB", color: "#1E6FBF", label: "Agendado" },
  concluido: { bg: "#E6F4EA", color: "#05873C", label: "Concluído" },
  pago: { bg: "#EFE5FB", color: "#6E3FBF", label: "Pago" },
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const sb = supabase as unknown as { from: (t: string) => any; rpc?: any };

interface Props {
  contratoId: string;
  lojaId: string | null | undefined;
  canEdit: boolean;
  funcao?: Funcao; // default: medidor
  titulo?: string;
  labelPessoa?: string;
  labelTotal?: string;
}

export function ContratoMedicaoAmbientesSection({
  contratoId,
  lojaId,
  canEdit,
  funcao = "medidor",
  titulo,
  labelPessoa,
  labelTotal,
}: Props) {
  const qc = useQueryClient();

  // Field name mapping per função
  const F =
    funcao === "medidor"
      ? { pessoaId: "medidor_id", pct: "percentual_medidor", valor: "valor_medidor", status: "status_medicao", data: "data_medicao" }
      : funcao === "conferente"
      ? { pessoaId: "conferente_id", pct: "percentual_conferente", valor: "valor_conferente", status: "status_conferencia", data: "data_conferencia" }
      : { pessoaId: "montador_id", pct: "percentual_montador", valor: "valor_montador", status: "status_montagem", data: "data_montagem" };

  const labelDefaults: Record<Funcao, { titulo: string; pessoa: string; valor: string; total: string }> = {
    medidor: { titulo: "Medição por ambiente", pessoa: "Medidor", valor: "Valor medidor", total: "Total a pagar medidores" },
    conferente: { titulo: "Conferência por ambiente", pessoa: "Conferente", valor: "Valor conferente", total: "Total a pagar conferentes" },
    montador: { titulo: "Montagem por ambiente", pessoa: "Montador", valor: "Valor montador", total: "Total a pagar montadores" },
  };
  const tituloSec = titulo ?? labelDefaults[funcao].titulo;
  const lblPessoa = labelPessoa ?? labelDefaults[funcao].pessoa;
  const lblValor = labelDefaults[funcao].valor;
  const lblTotal = labelTotal ?? labelDefaults[funcao].total;

  const { data: ambientes, isLoading } = useQuery<AmbienteRow[]>({
    queryKey: ["ambientes_med_conf", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("contrato_ambientes")
        .select(
          "id, nome, valor_liquido, medidor_id, percentual_medidor, valor_medidor, status_medicao, data_medicao, conferente_id, percentual_conferente, valor_conferente, status_conferencia, data_conferencia, montador_id, percentual_montador, valor_montador, status_montagem, data_montagem, medicao_fotos, medicao_scan_url, medicao_concluido, observacoes",
        )
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AmbienteRow[];
    },
  });

  const { data: pessoas } = useQuery<PessoaOpt[]>({
    queryKey: ["tec-options", lojaId, funcao],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("tecnicos_montadores")
        .select("id, nome, percentual_padrao, ativo, funcoes")
        .eq("loja_id", lojaId)
        .contains("funcoes", [funcao])
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PessoaOpt[];
    },
  });

  const updateAmbiente = async (id: string, patch: Record<string, any>) => {
    const { error } = await sb.from("contrato_ambientes").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["ambientes_med_conf", contratoId] });
    qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
    return true;
  };

  const handlePessoaChange = (a: AmbienteRow, value: string) => {
    const realId = value === "__none__" ? null : value;
    const m = pessoas?.find((x) => x.id === realId);
    updateAmbiente(a.id, {
      [F.pessoaId]: realId,
      [F.pct]: m ? Number(m.percentual_padrao) : a[F.pct],
    });
  };

  const handleStatusChange = async (a: AmbienteRow, novo: StatusMed) => {
    // Para montador: ao mudar para "agendado", a data é obrigatória
    if (funcao === "montador" && novo === "agendado" && !a[F.data]) {
      toast.error("Defina a data de montagem antes de marcar como Agendado.");
      return;
    }

    const ok = await updateAmbiente(a.id, { [F.status]: novo });
    if (!ok) return;

    if (novo === "pago") {
      const valor = Number(a[F.valor]) || 0;
      const pessoaId = a[F.pessoaId] as string | null;
      const pessoaNome =
        (pessoaId && pessoas?.find((p) => p.id === pessoaId)?.nome) || "—";

      // 1) Histórico do contrato
      try {
        await (sb as any).rpc?.("contrato_log_inserir", {
          _contrato_id: contratoId,
          _acao:
            funcao === "medidor"
              ? "medidor_pago"
              : funcao === "conferente"
              ? "conferente_pago"
              : "montador_pago",
          _titulo: `${lblPessoa} pago`,
          _descricao: `${lblPessoa} ${pessoaNome} — Ambiente ${a.nome} — ${fmtBRL(valor)}`,
        });
      } catch (e: any) {
        console.warn("log inserir falhou", e?.message);
      }

      // 2) DRE — agora a vw_contratos_dre soma automaticamente os ambientes pagos
      // (montador → custo_montagem_real; medidor/conferente → outros_custos_reais).
      // Apenas invalida caches para refletir o novo cálculo.
      qc.invalidateQueries({ queryKey: ["dre", contratoId] });
      qc.invalidateQueries({ queryKey: ["dre-tab", contratoId] });
      qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });

      toast.success(`${lblPessoa} marcado como pago e lançado no DRE`);
    }
  };

  // Total a pagar (somente desta função)
  const totalPagar = (ambientes ?? []).reduce(
    (acc, a) => acc + (Number(a[F.valor]) || 0),
    0,
  );

  return (
    <div
      className="rounded-xl bg-white"
      style={{ border: "0.5px solid #E8ECF2", overflow: "hidden" }}
    >
      <div className="flex flex-col gap-1 px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}>{tituloSec}</h3>
          <span style={{ fontSize: 12, color: "#6B7A90" }}>
            {ambientes?.length ?? 0} ambiente{(ambientes?.length ?? 0) === 1 ? "" : "s"}
          </span>
        </div>
        {funcao === "medidor" && ambientes && ambientes.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7A90] font-medium">
              <span>Progresso da medição</span>
              <span>{ambientes.filter(a => a.medicao_concluido).length} de {ambientes.length} ambientes concluídos</span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500" 
                style={{ width: `${(ambientes.filter(a => a.medicao_concluido).length / ambientes.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {funcao !== "medidor" && (
        <div className="overflow-x-auto" style={{ borderTop: "0.5px solid #E8ECF2" }}>
          <table className="w-full" style={{ minWidth: 980 }}>
            <thead style={{ backgroundColor: "#F7F9FC" }}>
              <tr>
                {["Ambiente", "Valor líquido", lblPessoa, "%", lblValor, "Status", "Data"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left"
                      style={{
                        fontSize: 11,
                        color: "#6B7A90",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && (ambientes?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum ambiente cadastrado neste contrato.
                </td>
              </tr>
            )}
            {ambientes?.map((a) => {
              if ((funcao as string) === "medidor") return null;

              const status = (a[F.status] as StatusMed) || "pendente";
              const st = STATUS_STYLE[status];
              return (
                <tr key={a.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-3 py-2 text-sm font-medium" style={{ minWidth: 220, color: "#0D1117" }}>
                    {a.nome}
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ whiteSpace: "nowrap", color: "#0D1117" }}>
                    {fmtBRL(Number(a.valor_liquido))}
                  </td>
                  <td className="px-3 py-2" style={{ minWidth: 180 }}>
                    <Select
                      value={(a[F.pessoaId] as string | null) ?? "__none__"}
                      onValueChange={(v) => handlePessoaChange(a, v)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger style={{ height: 32, fontSize: 13 }}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sem {lblPessoa.toLowerCase()} —</SelectItem>
                        {pessoas?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2" style={{ width: 80 }}>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={Number(a[F.pct])}
                      disabled={!canEdit}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(a[F.pct]))
                          updateAmbiente(a.id, { [F.pct]: v });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ whiteSpace: "nowrap", color: "#0D1117" }}>
                    {fmtBRL(Number(a[F.valor]))}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={status}
                      onValueChange={(v) => handleStatusChange(a, v as StatusMed)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger
                        style={{
                          height: 28,
                          fontSize: 12,
                          backgroundColor: st.bg,
                          color: st.color,
                          border: "none",
                          fontWeight: 500,
                          width: 120,
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2" style={{ width: 160 }}>
                    <Input
                      type="date"
                      defaultValue={(a[F.data] as string | null) ?? ""}
                      disabled={!canEdit}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== a[F.data])
                          updateAmbiente(a.id, { [F.data]: v as any });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {funcao === "medidor" && (
        <div className="flex flex-col" style={{ borderTop: "0.5px solid #E8ECF2" }}>
          <table className="w-full">
            <tbody>
              {isLoading && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              )}
              {!isLoading && (ambientes?.length ?? 0) === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center">
                    <AlertCircle size={32} className="mx-auto text-neutral-300 mb-3" />
                    <p className="text-sm font-medium text-[#0D1117]">Nenhum ambiente encontrado</p>
                    <p className="text-xs text-[#6B7A90] mt-1">Os ambientes são importados automaticamente do XML do contrato.</p>
                  </td>
                </tr>
              )}
              {ambientes?.map((a) => (
                <AmbienteMedicaoPanel 
                  key={a.id} 
                  ambiente={a} 
                  onUpdate={updateAmbiente} 
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer com total a pagar */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ borderTop: "0.5px solid #E8ECF2", backgroundColor: "#FAFBFD" }}
      >
        <div className="flex items-center gap-2 text-[11px] text-[#6B7A90]">
          <Camera size={14} className="text-pink-500" />
          <span>Em breve: medição direta pela câmera no app para funcionários</span>
        </div>
        <div className="flex items-center gap-3">
          {funcao === "medidor" && ambientes && ambientes.length > 0 && (
            <Button
              disabled={ambientes.some(a => !a.medicao_concluido)}
              onClick={async () => {
                const { error } = await supabase.rpc('avancar_contrato', { 
                  p_contrato_id: contratoId,
                  p_usuario_id: (await supabase.auth.getUser()).data.user?.id
                });
                if (error) {
                  toast.error("Erro ao liberar para conferência: " + error.message);
                } else {
                  toast.success("Contrato liberado para conferência!");
                  qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });
                }
              }}
              className="bg-[#12B76A] hover:bg-[#0e9a58] h-9 text-xs font-semibold px-4"
            >
              Liberar para conferência
            </Button>
          )}
          <span style={{ fontSize: 12, color: "#6B7A90" }}>{lblTotal}:</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>
            {fmtBRL(totalPagar)}
          </span>
        </div>
      </div>
    </div>
  );
}

function AmbienteMedicaoPanel({ 
  ambiente, 
  onUpdate 
}: { 
  ambiente: AmbienteRow; 
  onUpdate: (id: string, patch: any) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState<'photos' | 'scan' | null>(null);
  const [activePhoto, setActivePhoto] = useState<any | null>(null);

  const photos = Array.isArray(ambiente.medicao_fotos) ? ambiente.medicao_fotos : [];
  const hasPhotos = photos.length > 0;
  const hasScan = !!ambiente.medicao_scan_url;
  const isConcluido = !!ambiente.medicao_concluido;
  const inProgress = !isConcluido && (hasPhotos || hasScan || !!ambiente.observacoes);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photos' | 'scan') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(type);
    try {
      const results = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${ambiente.id}/${type}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('medicao-arquivos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('medicao-arquivos')
          .getPublicUrl(filePath);

        results.push(publicUrl);
        if (type === 'scan') break; // Only one scan
      }

      if (type === 'photos') {
        const newPhotos = [...photos, ...results.map(url => ({ url, annotations: [] }))];
        await onUpdate(ambiente.id, { medicao_fotos: newPhotos });
      } else {
        await onUpdate(ambiente.id, { medicao_scan_url: results[0], status_medicao: 'concluido' });
      }
      toast.success("Arquivo enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = async (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    await onUpdate(ambiente.id, { medicao_fotos: newPhotos });
  };

  const saveAnnotations = async (annotations: any[]) => {
    if (!activePhoto) return;
    const newPhotos = photos.map(p => 
      p.url === activePhoto.url ? { ...p, annotations } : p
    );
    await onUpdate(ambiente.id, { medicao_fotos: newPhotos });
    setActivePhoto(null);
    toast.success("Anotações salvas!");
  };

  const toggleConcluido = async () => {
    if (!hasPhotos || !hasScan) {
      toast.error("É necessário pelo menos 1 foto e o scan da folha para concluir.");
      return;
    }
    const novoStatus = !isConcluido;
    await onUpdate(ambiente.id, { 
      medicao_concluido: novoStatus,
      status_medicao: novoStatus ? 'concluido' : 'pendente'
    });
    toast.success(novoStatus ? "Medição concluída!" : "Ambiente reaberto");
  };

  return (
    <tr style={{ borderTop: "0.5px solid #E8ECF2" }}>
      <td colSpan={7} className="p-0">
        <div className={cn("p-4 transition-colors", expanded ? "bg-white" : "hover:bg-neutral-50")}>
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {expanded ? <ChevronUp size={16} className="text-[#6B7A90]" /> : <ChevronDown size={16} className="text-[#6B7A90]" />}
                <span className="font-medium text-sm text-[#0D1117]">{ambiente.nome}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <ImageIcon size={14} className={hasPhotos ? "text-green-500" : "text-neutral-300"} />
                  <span className="text-[11px] text-[#6B7A90]">{photos.length} fotos</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText size={14} className={hasScan ? "text-green-500" : "text-neutral-300"} />
                  <span className="text-[11px] text-[#6B7A90]">{hasScan ? "Scan enviado" : "Sem scan"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider",
                isConcluido ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              )}>
                {isConcluido ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Concluído</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} />
                    <span>Pendente</span>
                  </>
                )}
              </div>
              <Button 
                variant={isConcluido ? "outline" : "default"} 
                size="sm" 
                className={cn("h-8 text-xs", !isConcluido && "bg-[#1E6FBF] hover:bg-[#165a9e]")}
                onClick={(e) => { e.stopPropagation(); toggleConcluido(); }}
              >
                {isConcluido ? "Reabrir" : "Concluir Medição"}
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 border-t pt-6">
              {/* Fotos Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-[#6B7A90] flex items-center gap-2">
                    <ImageIcon size={14} />
                    Fotos com Anotações
                  </h4>
                  <label className="cursor-pointer">
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'photos')} />
                    <div className="flex items-center gap-2 text-[#1E6FBF] hover:underline text-xs font-medium">
                      {uploading === 'photos' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Adicionar fotos
                    </div>
                  </label>
                </div>

                {hasPhotos ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="group relative aspect-square rounded-lg border overflow-hidden bg-neutral-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow" onClick={() => setActivePhoto(photo)}>
                        <img src={photo.url} alt="Ambiente" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-[10px] font-medium">Ver / Anotar</span>
                        </div>
                        {photo.annotations?.length > 0 && (
                          <div className="absolute top-1 left-1 bg-pink-500 text-white text-[9px] px-1 rounded-sm font-bold shadow-sm">
                            {photo.annotations.length}
                          </div>
                        )}
                        <button 
                          className="absolute top-1 right-1 p-1 bg-white/90 rounded-md text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 rounded-lg border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 text-neutral-400">
                    <ImageIcon size={24} strokeWidth={1.5} />
                    <span className="text-xs">Nenhuma foto enviada</span>
                  </div>
                )}
              </div>

              {/* Scan & Obs Section */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase text-[#6B7A90] flex items-center gap-2">
                      <FileText size={14} />
                      Scan da Folha Manuscrita
                    </h4>
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'scan')} />
                      <div className="flex items-center gap-2 text-[#1E6FBF] hover:underline text-xs font-medium">
                        {uploading === 'scan' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {hasScan ? "Substituir scan" : "Enviar scan"}
                      </div>
                    </label>
                  </div>

                  {hasScan ? (
                    <div className="relative group rounded-lg border overflow-hidden bg-neutral-100 max-h-48 shadow-sm">
                      <img src={ambiente.medicao_scan_url} alt="Scan Medição" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => window.open(ambiente.medicao_scan_url, '_blank')}>
                        <span className="text-white text-[10px] font-medium uppercase tracking-wider">Visualizar PDF/Imagem</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 rounded-lg border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 text-neutral-400">
                      <FileText size={24} strokeWidth={1.5} />
                      <span className="text-xs">Obrigatório para conclusão</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-[#6B7A90]">Observações Gerais</h4>
                  <Textarea 
                    placeholder="Notas sobre o ambiente, dificuldades, observações técnicas..."
                    className="text-xs min-h-[80px] bg-white border-neutral-200"
                    defaultValue={ambiente.observacoes || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (ambiente.observacoes || "")) {
                        onUpdate(ambiente.id, { observacoes: e.target.value });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {activePhoto && (
          <PhotoAnnotationViewer 
            open={!!activePhoto}
            onOpenChange={(open) => !open && setActivePhoto(null)}
            photo={activePhoto}
            onSave={saveAnnotations}
          />
        )}
      </td>
    </tr>
  );
}

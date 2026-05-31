import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Trash2, MessageSquare, Loader2, ZoomIn } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  contratoId: string;
  ambienteId?: string;
  etapa?: "medicao" | "conferencia";
}

interface FotoAnotacao {
  id: string;
  url: string;
  anotacao: string | null;
  created_at: string;
  created_by: string | null;
}

export function FotoAnotacaoUpload({ contratoId, ambienteId, etapa = "medicao" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [anotacaoEdit, setAnotacaoEdit] = useState<{ id: string; texto: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const queryKey = ["tecnico-fotos", contratoId, ambienteId || "all"];

  const { data: fotos = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = (supabase as any)
        .from("tecnico_fotos")
        .select("id, url, anotacao, created_at, created_by")
        .eq("contrato_id", contratoId)
        .eq("etapa", etapa)
        .order("created_at", { ascending: false });

      if (ambienteId) query = query.eq("ambiente_id", ambienteId);

      const { data, error } = await query;
      if (error) throw error;
      return data as FotoAnotacao[];
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let count = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      const ext = file.name.split(".").pop() || "jpg";
      const path = `tecnico/${contratoId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("contrato-arquivos")
        .upload(path, file, { contentType: file.type });

      if (upErr) {
        toast.error(`Erro ao enviar ${file.name}: ${upErr.message}`);
        continue;
      }

      const { data: signedData } = await supabase.storage
        .from("contrato-arquivos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      const url = signedData?.signedUrl || path;

      const { error: dbErr } = await (supabase as any).from("tecnico_fotos").insert({
        contrato_id: contratoId,
        ambiente_id: ambienteId || null,
        etapa,
        url,
        storage_path: path,
        created_by: user?.id,
      });

      if (dbErr) toast.error(dbErr.message);
      else count++;
    }

    if (count > 0) {
      toast.success(`${count} foto(s) enviada(s)`);
      qc.invalidateQueries({ queryKey });
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleSalvarAnotacao() {
    if (!anotacaoEdit) return;
    const { error } = await (supabase as any)
      .from("tecnico_fotos")
      .update({ anotacao: anotacaoEdit.texto })
      .eq("id", anotacaoEdit.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Anotação salva");
      qc.invalidateQueries({ queryKey });
    }
    setAnotacaoEdit(null);
  }

  async function handleExcluir(id: string) {
    if (!window.confirm("Excluir esta foto?")) return;
    const { error } = await (supabase as any).from("tecnico_fotos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Foto excluída");
      qc.invalidateQueries({ queryKey });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5" />
          Fotos {etapa === "medicao" ? "da Medição" : "da Conferência"}
        </h4>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          Adicionar fotos
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-400 text-center py-4">Carregando fotos...</div>
      ) : fotos.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed rounded-lg">
          <Camera className="h-6 w-6 text-slate-300 mx-auto mb-1" />
          <p className="text-xs text-slate-400">Nenhuma foto registrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {fotos.map(f => (
            <div key={f.id} className="relative group rounded-lg overflow-hidden border">
              <img
                src={f.url}
                alt="Foto medição"
                className="w-full h-28 object-cover cursor-pointer"
                onClick={() => setPreviewUrl(f.url)}
              />
              {/* Overlay com ações */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={() => setPreviewUrl(f.url)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={() => setAnotacaoEdit({ id: f.id, texto: f.anotacao || "" })}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white hover:bg-red-500/50"
                  onClick={() => handleExcluir(f.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {/* Anotação badge */}
              {f.anotacao && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-[9px] text-white truncate">{f.anotacao}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog de anotação */}
      {anotacaoEdit && (
        <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
          <Textarea
            placeholder="Adicione uma anotação sobre esta foto (ex: 'Parede com desnível de 2cm')"
            value={anotacaoEdit.texto}
            onChange={e => setAnotacaoEdit({ ...anotacaoEdit, texto: e.target.value })}
            rows={2}
            className="text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs bg-[#1E6FBF]" onClick={handleSalvarAnotacao}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAnotacaoEdit(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Preview fullscreen */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { ContratoMedicaoAmbientesSection } from "./ContratoMedicaoAmbientesSection";
import { ConferenciaAmbientesSection } from "./ConferenciaAmbientesSection";

interface TecnicoTabProps {
  contratoId: string;
}

export function ContratoTecnicoTab({ contratoId }: TecnicoTabProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [observacoesFinais, setObservacoesFinais] = useState("");
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");

  const { data: contrato } = useQuery({
    queryKey: ["contrato-tecnico", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, loja_id, sub_etapa_tecnico, trava_medicao_ok, trava_tecnico_ok")
        .eq("id", contratoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`tecnico-contrato-${contratoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contratos", filter: `id=eq.${contratoId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["contrato-tecnico", contratoId] });
          qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contratoId, qc]);

  const avancarMutation = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc("avancar_contrato", {
        p_contrato_id: contratoId,
        p_usuario_id: auth.user?.id ?? undefined,
      });
      if (error) throw error;
      const res = data as { ok: boolean; erro?: string };
      if (!res.ok) throw new Error(res.erro ?? "Falha ao avançar");
      return res;
    },
    onSuccess: () => {
      toast.success("Contrato liberado para produção! ✓");
      qc.invalidateQueries({ queryKey: ["contrato-tecnico", contratoId] });
      qc.invalidateQueries({ queryKey: ["contrato", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Arquivos
  const { data: arquivos = [], refetch: refetchArquivos } = useQuery({
    queryKey: ["arquivos", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("contrato-arquivos")
        .list(contratoId, { sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    const path = `${contratoId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("contrato-arquivos").upload(path, file);
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Arquivo enviado");
    refetchArquivos();
  };

  const handleDownload = async (name: string) => {
    const { data, error } = await supabase.storage
      .from("contrato-arquivos")
      .createSignedUrl(`${contratoId}/${name}`, 60);
    if (error || !data) {
      toast.error("Não foi possível baixar");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (name: string) => {
    const { error } = await supabase.storage
      .from("contrato-arquivos")
      .remove([`${contratoId}/${name}`]);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Arquivo removido");
    refetchArquivos();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.size > 50 * 1024 * 1024) {
      toast.error("Arquivo excede 50MB");
      return;
    }
    handleUpload(f);
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Seção 1 — Medição */}
      <ContratoMedicaoAmbientesSection
        contratoId={contratoId}
        lojaId={contrato?.loja_id}
        canEdit={canEdit}
        funcao="medidor"
        titulo="Medição"
      />

      {/* Seção 2 — Conferência (com fluxo XML) */}
      <ConferenciaAmbientesSection contratoId={contratoId} lojaId={contrato?.loja_id} />

      {/* Arquivos do projeto */}
      <div
        className="rounded-xl bg-white"
        style={{ border: "0.5px solid #E8ECF2", padding: 20 }}
      >
        <h3 className="mb-3" style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}>
          Arquivos do projeto
        </h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.dwg,application/pdf,image/png"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {canEdit && !contrato?.trava_tecnico_ok && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className="cursor-pointer rounded-lg flex flex-col items-center justify-center text-center transition-colors"
            style={{
              border: `2px dashed ${dragOver ? "#1E6FBF" : "#B0BAC9"}`,
              backgroundColor: dragOver ? "#EFF6FF" : "transparent",
              padding: "24px 16px",
            }}
          >
            <Upload style={{ width: 20, height: 20, color: dragOver ? "#1E6FBF" : "#6B7A90" }} />
            <p className="mt-2" style={{ fontSize: 13, color: "#6B7A90" }}>
              {uploading ? "Enviando..." : "Arraste o projeto aqui ou clique para selecionar"}
            </p>
            <p className="mt-1" style={{ fontSize: 11, color: "#B0BAC9" }}>
              PDF, PNG, DWG — máx 50MB
            </p>
          </div>
        )}

        <ul className="mt-3 flex flex-col">
          {arquivos.length === 0 && (
            <li style={{ fontSize: 13, color: "#6B7A90" }}>Nenhum arquivo enviado ainda.</li>
          )}
          {arquivos.map((arq) => (
            <li
              key={arq.id ?? arq.name}
              className="flex items-center gap-3 py-2"
              style={{ borderTop: "0.5px solid #E8ECF2" }}
            >
              <FileText className="h-4 w-4 shrink-0" style={{ color: "#6B7A90" }} />
              <span className="flex-1 truncate" style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>
                {arq.name.replace(/^\d+-/, "")}
              </span>
              <span style={{ fontSize: 11, color: "#6B7A90", minWidth: 70, textAlign: "right" }}>
                {arq.metadata?.size ? formatBytes(arq.metadata.size as number) : "—"}
              </span>
              <span style={{ fontSize: 11, color: "#B0BAC9", minWidth: 80, textAlign: "right" }}>
                {arq.created_at ? new Date(arq.created_at).toLocaleDateString("pt-BR") : ""}
              </span>
              <button
                onClick={() => handleDownload(arq.name)}
                className="rounded p-1.5 hover:bg-muted"
                aria-label="Baixar"
              >
                <Download className="h-4 w-4" style={{ color: "#1E6FBF" }} />
              </button>
              {canEdit && !contrato?.trava_tecnico_ok && (
                <button
                  onClick={() => handleDelete(arq.name)}
                  className="rounded p-1.5 hover:bg-muted"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" style={{ color: "#B42318" }} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Validação final */}
      {contrato?.trava_tecnico_ok && (
        <div
          style={{
            backgroundColor: "#F0FDF9",
            border: "1px solid #12B76A",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 500, color: "#05873C" }}>Pronto para produção</h4>
          <div className="mt-3">
            <label style={{ fontSize: 12, color: "#05873C" }}>Observações finais</label>
            <Textarea
              value={observacoesFinais}
              onChange={(e) => setObservacoesFinais(e.target.value)}
              rows={2}
              className="mt-1"
              placeholder="Notas para a equipe de produção..."
            />
          </div>
          <button
            onClick={() => avancarMutation.mutate()}
            disabled={avancarMutation.isPending}
            className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#12B76A", fontSize: 13 }}
          >
            {avancarMutation.isPending ? "Liberando..." : "Liberar para produção →"}
          </button>
        </div>
      )}
    </div>
  );
}

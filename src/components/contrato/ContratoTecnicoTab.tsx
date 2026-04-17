import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Paperclip, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TecnicoTabProps {
  contratoId: string;
}

const Card = ({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div
    className="rounded-xl bg-white"
    style={{ border: "0.5px solid #E8ECF2", padding: 20 }}
  >
    <div className="mb-4 flex items-center justify-between">
      <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

export function ContratoTecnicoTab({ contratoId }: TecnicoTabProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: itens = [] } = useQuery({
    queryKey: ["checklist", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklists_tecnicos")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-min"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("id, nome");
      return data ?? [];
    },
  });
  const userMap = new Map(usuarios.map((u) => [u.id, u.nome]));

  const total = itens.length;
  const concluidos = itens.filter((i) => i.concluido).length;
  const pendentes = total - concluidos;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  const toggleMutation = useMutation({
    mutationFn: async (item: { id: string; concluido: boolean }) => {
      const { error } = await supabase
        .from("checklists_tecnicos")
        .update({
          concluido: !item.concluido,
          data: !item.concluido ? new Date().toISOString() : null,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", contratoId] });
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
    const { error } = await supabase.storage
      .from("contrato-arquivos")
      .upload(path, file);
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

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Checklist técnico"
        right={
          <span style={{ fontSize: 12, color: "#6B7A90" }}>
            {concluidos} de {total} itens concluídos
          </span>
        }
      >
        {pendentes > 0 && (
          <div
            className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: "#FEF3C7", color: "#E8A020", fontSize: 12 }}
          >
            <AlertTriangle className="h-4 w-4" />
            Checklist incompleto — {pendentes} {pendentes === 1 ? "item pendente" : "itens pendentes"}.
            Conclua para liberar produção.
          </div>
        )}

        {/* Progresso */}
        <div
          className="mb-4 h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "#E8ECF2" }}
        >
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: "#1E6FBF" }}
          />
        </div>

        <ul className="flex flex-col">
          {itens.length === 0 && (
            <li style={{ fontSize: 13, color: "#6B7A90" }}>
              Nenhum item de checklist cadastrado.
            </li>
          )}
          {itens.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 py-2"
              style={{ borderTop: "0.5px solid #E8ECF2" }}
            >
              <button
                onClick={() => toggleMutation.mutate({ id: item.id, concluido: item.concluido })}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors"
                style={{
                  backgroundColor: item.concluido ? "#12B76A" : "transparent",
                  border: item.concluido ? "1px solid #12B76A" : "1.5px solid #B0BAC9",
                }}
                aria-label="Toggle item"
              >
                {item.concluido && <Check className="h-3 w-3 text-white" />}
              </button>
              <span
                className="flex-1"
                style={{
                  fontSize: 13,
                  color: item.concluido ? "#6B7A90" : "#0D1117",
                  textDecoration: item.concluido ? "line-through" : "none",
                }}
              >
                {item.item}
              </span>
              <span style={{ fontSize: 12, color: "#6B7A90", minWidth: 110 }}>
                {item.responsavel ? userMap.get(item.responsavel) ?? "—" : "—"}
              </span>
              <span style={{ fontSize: 12, color: "#6B7A90", minWidth: 90 }}>
                {item.data ? new Date(item.data).toLocaleDateString("pt-BR") : "—"}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Arquivos do projeto">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
        >
          <Paperclip className="h-4 w-4" />
          {uploading ? "Enviando..." : "Anexar projeto Promob"}
        </button>

        <ul className="mt-4 flex flex-col">
          {arquivos.length === 0 && (
            <li style={{ fontSize: 13, color: "#6B7A90" }}>
              Nenhum arquivo enviado ainda.
            </li>
          )}
          {arquivos.map((arq) => (
            <li
              key={arq.id ?? arq.name}
              className="flex items-center justify-between py-2"
              style={{ borderTop: "0.5px solid #E8ECF2" }}
            >
              <div className="flex flex-col">
                <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>
                  {arq.name.replace(/^\d+-/, "")}
                </span>
                <span style={{ fontSize: 11, color: "#6B7A90" }}>
                  {arq.created_at
                    ? new Date(arq.created_at).toLocaleDateString("pt-BR")
                    : ""}
                </span>
              </div>
              <button
                onClick={() => handleDownload(arq.name)}
                className="rounded p-2 hover:bg-muted"
                aria-label="Baixar"
              >
                <Download className="h-4 w-4" style={{ color: "#1E6FBF" }} />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Camera, Plus, X } from "lucide-react";

const sb = supabase as unknown as { from: (t: string) => any };

type Tipo = "dano" | "falta_material" | "retrabalho" | "atraso" | "outro";
type Gravidade = "baixa" | "media" | "alta";

const TIPO_LABELS: Record<Tipo, { label: string; color: string }> = {
  dano: { label: "Dano", color: "#E53935" },
  falta_material: { label: "Falta Material", color: "#E8A020" },
  retrabalho: { label: "Retrabalho", color: "#9C27B0" },
  atraso: { label: "Atraso", color: "#1E6FBF" },
  outro: { label: "Outro", color: "#6B7A90" },
};

const GRAVIDADE_LABELS: Record<Gravidade, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "#12B76A" },
  media: { label: "Média", color: "#E8A020" },
  alta: { label: "Alta", color: "#E53935" },
};

interface Props {
  agendamentoId: string;
  contratoId: string;
}

export function MontagemOcorrencias({ agendamentoId, contratoId }: Props) {
  const { perfil, user } = useAuth();
  const lojaId = perfil?.loja_id;
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState<Tipo>("dano");
  const [descricao, setDescricao] = useState("");
  const [gravidade, setGravidade] = useState<Gravidade>("media");
  const [foto, setFoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: ocorrencias = [] } = useQuery({
    queryKey: ["montagem-ocorrencias", agendamentoId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("montagem_ocorrencias")
        .select("*")
        .eq("agendamento_id", agendamentoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        tipo: Tipo;
        descricao: string;
        gravidade: Gravidade;
        foto_url: string | null;
        created_at: string;
      }>;
    },
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      let fotoUrl: string | null = null;

      if (foto) {
        setUploading(true);
        const ext = foto.name.split(".").pop();
        const path = `montagem/${contratoId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("contrato-arquivos")
          .upload(path, foto);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("contrato-arquivos")
          .getPublicUrl(path);
        fotoUrl = urlData.publicUrl;
        setUploading(false);
      }

      const { error } = await sb.from("montagem_ocorrencias").insert({
        agendamento_id: agendamentoId,
        contrato_id: contratoId,
        loja_id: lojaId,
        tipo,
        descricao,
        gravidade,
        foto_url: fotoUrl,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ocorrência registrada");
      qc.invalidateQueries({ queryKey: ["montagem-ocorrencias", agendamentoId] });
      setShowForm(false);
      setDescricao("");
      setFoto(null);
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
      setUploading(false);
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "#0D1117", margin: 0 }}>
          Ocorrências
        </h4>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} className="mr-1" /> Registrar
          </Button>
        )}
      </div>

      {showForm && (
        <div
          style={{
            borderRadius: 12,
            border: "0.5px solid #E8ECF2",
            padding: 14,
            background: "#FAFBFC",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <Label style={{ fontSize: 11, color: "#6B7A90" }}>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ fontSize: 11, color: "#6B7A90" }}>Gravidade</Label>
              <Select value={gravidade} onValueChange={(v) => setGravidade(v as Gravidade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GRAVIDADE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label style={{ fontSize: 11, color: "#6B7A90" }}>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a ocorrência..."
              style={{ fontSize: 13, minHeight: 60 }}
            />
          </div>

          <div>
            <Label style={{ fontSize: 11, color: "#6B7A90" }}>Foto (opcional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              style={{ fontSize: 12 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!descricao.trim() || salvarMutation.isPending || uploading}
              onClick={() => salvarMutation.mutate()}
            >
              {uploading ? "Enviando foto..." : salvarMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ocorrencias.length === 0 && !showForm && (
          <span style={{ fontSize: 12, color: "#6B7A90" }}>Nenhuma ocorrência registrada</span>
        )}
        {ocorrencias.map((oc) => (
          <div
            key={oc.id}
            style={{
              borderRadius: 8,
              border: "0.5px solid #E8ECF2",
              padding: "10px 12px",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: TIPO_LABELS[oc.tipo]?.color + "18",
                  color: TIPO_LABELS[oc.tipo]?.color,
                }}
              >
                {TIPO_LABELS[oc.tipo]?.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: GRAVIDADE_LABELS[oc.gravidade]?.color + "18",
                  color: GRAVIDADE_LABELS[oc.gravidade]?.color,
                }}
              >
                {GRAVIDADE_LABELS[oc.gravidade]?.label}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#0D1117", margin: 0 }}>{oc.descricao}</p>
            {oc.foto_url && (
              <a href={oc.foto_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#1E6FBF" }}>
                <Camera size={12} style={{ display: "inline", marginRight: 4 }} />
                Ver foto
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

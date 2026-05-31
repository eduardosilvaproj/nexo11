import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

const sb = supabase as unknown as { from: (t: string) => any };

interface Props {
  agendamentoId: string;
  contratoId: string;
  clienteNome: string;
}

const CATEGORIAS = [
  { key: "nota_pontualidade", label: "Pontualidade" },
  { key: "nota_limpeza", label: "Limpeza" },
  { key: "nota_qualidade", label: "Qualidade" },
  { key: "nota_atendimento", label: "Atendimento" },
] as const;

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: "none",
            border: "none",
            cursor: disabled ? "default" : "pointer",
            padding: 1,
          }}
        >
          <Star
            size={20}
            fill={(hover || value) >= star ? "#E8A020" : "none"}
            color={(hover || value) >= star ? "#E8A020" : "#D1D5DB"}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

export function MontagemAvaliacao({ agendamentoId, contratoId, clienteNome }: Props) {
  const { perfil, user } = useAuth();
  const lojaId = perfil?.loja_id;
  const qc = useQueryClient();

  const [notaGeral, setNotaGeral] = useState(0);
  const [notaPontualidade, setNotaPontualidade] = useState(0);
  const [notaLimpeza, setNotaLimpeza] = useState(0);
  const [notaQualidade, setNotaQualidade] = useState(0);
  const [notaAtendimento, setNotaAtendimento] = useState(0);
  const [nps, setNps] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");

  const { data: existente, isLoading } = useQuery({
    queryKey: ["montagem-avaliacao", agendamentoId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("montagem_avaliacoes")
        .select("*")
        .eq("agendamento_id", agendamentoId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setNotaGeral(data.nota_geral ?? 0);
        setNotaPontualidade(data.nota_pontualidade ?? 0);
        setNotaLimpeza(data.nota_limpeza ?? 0);
        setNotaQualidade(data.nota_qualidade ?? 0);
        setNotaAtendimento(data.nota_atendimento ?? 0);
        setNps(data.nps ?? null);
        setComentario(data.comentario ?? "");
      }
      return data as {
        id: string;
        nota_geral: number;
        nota_pontualidade: number;
        nota_limpeza: number;
        nota_qualidade: number;
        nota_atendimento: number;
        nps: number;
        comentario: string;
      } | null;
    },
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        agendamento_id: agendamentoId,
        contrato_id: contratoId,
        loja_id: lojaId,
        nota_geral: notaGeral || null,
        nota_pontualidade: notaPontualidade || null,
        nota_limpeza: notaLimpeza || null,
        nota_qualidade: notaQualidade || null,
        nota_atendimento: notaAtendimento || null,
        nps,
        comentario: comentario.trim() || null,
        created_by: user?.id,
      };

      if (existente) {
        const { error } = await sb
          .from("montagem_avaliacoes")
          .update(payload)
          .eq("id", existente.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("montagem_avaliacoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Avaliação salva com sucesso");
      qc.invalidateQueries({ queryKey: ["montagem-avaliacao", agendamentoId] });
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const jaPreenchido = !!existente;

  const categoriasState: Record<string, { value: number; setter: (v: number) => void }> = {
    nota_pontualidade: { value: notaPontualidade, setter: setNotaPontualidade },
    nota_limpeza: { value: notaLimpeza, setter: setNotaLimpeza },
    nota_qualidade: { value: notaQualidade, setter: setNotaQualidade },
    nota_atendimento: { value: notaAtendimento, setter: setNotaAtendimento },
  };

  if (isLoading) {
    return <span style={{ fontSize: 12, color: "#6B7A90" }}>Carregando...</span>;
  }

  return (
    <div
      style={{
        borderRadius: 12,
        border: "0.5px solid #E8ECF2",
        padding: 16,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <h4 style={{ fontSize: 13, fontWeight: 600, color: "#0D1117", margin: 0 }}>
        Avaliação do Cliente
      </h4>
      <span style={{ fontSize: 11, color: "#6B7A90" }}>
        Cliente: {clienteNome}
      </span>

      {/* Nota geral */}
      <div>
        <Label style={{ fontSize: 11, color: "#6B7A90" }}>Nota Geral</Label>
        <StarRating value={notaGeral} onChange={setNotaGeral} disabled={false} />
      </div>

      {/* Categorias */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {CATEGORIAS.map((cat) => (
          <div key={cat.key}>
            <Label style={{ fontSize: 11, color: "#6B7A90" }}>{cat.label}</Label>
            <StarRating
              value={categoriasState[cat.key].value}
              onChange={categoriasState[cat.key].setter}
              disabled={false}
            />
          </div>
        ))}
      </div>

      {/* NPS */}
      <div>
        <Label style={{ fontSize: 11, color: "#6B7A90" }}>
          De 0 a 10, recomendaria nosso serviço?
        </Label>
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNps(n)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: nps === n ? "2px solid #1E6FBF" : "1px solid #E8ECF2",
                background: nps === n ? "#E6F3FF" : "#fff",
                color: nps === n ? "#1E6FBF" : "#0D1117",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Comentário */}
      <div>
        <Label style={{ fontSize: 11, color: "#6B7A90" }}>Comentário</Label>
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Observações do cliente..."
          style={{ fontSize: 13, minHeight: 60 }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          size="sm"
          disabled={salvarMutation.isPending || notaGeral === 0}
          onClick={() => salvarMutation.mutate()}
        >
          {salvarMutation.isPending ? "Salvando..." : jaPreenchido ? "Atualizar Avaliação" : "Salvar Avaliação"}
        </Button>
      </div>
    </div>
  );
}

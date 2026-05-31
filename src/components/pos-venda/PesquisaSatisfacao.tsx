import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Send, MessageCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PesquisaSatisfacaoProps {
  chamadoId: string;
  contratoId: string;
  clienteNome: string;
  clienteContato: string | null;
}

interface Pesquisa {
  id: string;
  nota: number | null;
  comentario: string | null;
  recomendaria: boolean | null;
  respondido_em: string | null;
}

export default function PesquisaSatisfacao({
  chamadoId,
  contratoId,
  clienteNome,
  clienteContato,
}: PesquisaSatisfacaoProps) {
  const { perfil } = useAuth();
  const qc = useQueryClient();

  const [nota, setNota] = useState<number>(0);
  const [comentario, setComentario] = useState("");
  const [recomendaria, setRecomendaria] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: pesquisaExistente, isLoading } = useQuery({
    queryKey: ["posvenda-pesquisa", chamadoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("posvenda_pesquisas")
        .select("id, nota, comentario, recomendaria, respondido_em")
        .eq("chamado_id", chamadoId)
        .maybeSingle();
      if (error) throw error;
      return data as Pesquisa | null;
    },
  });

  const enviarMutation = useMutation({
    mutationFn: async () => {
      if (nota === 0) throw new Error("Selecione uma nota");

      const payload = {
        chamado_id: chamadoId,
        contrato_id: contratoId,
        loja_id: perfil?.loja_id,
        nota,
        comentario: comentario.trim() || null,
        recomendaria,
        respondido_em: new Date().toISOString(),
        enviado_por: (await supabase.auth.getUser()).data.user?.id,
      };

      const { error } = await (supabase as any)
        .from("posvenda_pesquisas")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pesquisa registrada com sucesso");
      qc.invalidateQueries({ queryKey: ["posvenda-pesquisa", chamadoId] });
      setShowForm(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar pesquisa");
    },
  });

  const gerarLinkWhatsApp = () => {
    if (!clienteContato) return null;
    const telefone = clienteContato.replace(/\D/g, "");
    const mensagem = encodeURIComponent(
      `Olá ${clienteNome}! Gostaríamos de saber sua opinião sobre o atendimento do chamado. ` +
      `Por favor, avalie de 1 a 5 (sendo 5 excelente) e nos diga se recomendaria nossos serviços. Obrigado!`
    );
    return `https://wa.me/55${telefone}?text=${mensagem}`;
  };

  if (isLoading) {
    return (
      <div style={{ fontSize: 13, color: "#6B7A90" }}>Carregando pesquisa...</div>
    );
  }

  // Show existing result
  if (pesquisaExistente) {
    return (
      <div
        className="rounded-xl bg-white p-4"
        style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #534AB7" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle size={14} color="#534AB7" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>
            Pesquisa Respondida
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={18}
                fill={s <= (pesquisaExistente.nota ?? 0) ? "#E8A020" : "none"}
                color={s <= (pesquisaExistente.nota ?? 0) ? "#E8A020" : "#E8ECF2"}
              />
            ))}
            <span style={{ fontSize: 13, color: "#0D1117", marginLeft: 8 }}>
              {pesquisaExistente.nota}/5
            </span>
          </div>
          {pesquisaExistente.comentario && (
            <p style={{ fontSize: 13, color: "#6B7A90" }}>
              "{pesquisaExistente.comentario}"
            </p>
          )}
          {pesquisaExistente.recomendaria !== null && (
            <p style={{ fontSize: 11, color: "#6B7A90" }}>
              Recomendaria: {pesquisaExistente.recomendaria ? "Sim" : "Não"}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show send button or form
  if (!showForm) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm(true)}
          className="gap-1.5"
          style={{ fontSize: 12 }}
        >
          <Send size={13} />
          Enviar pesquisa
        </Button>
        {clienteContato && (
          <a
            href={gerarLinkWhatsApp() ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline" className="gap-1.5" style={{ fontSize: 12 }}>
              <ExternalLink size={13} />
              WhatsApp
            </Button>
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl bg-white p-4 space-y-4"
      style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #534AB7" }}
    >
      <div className="flex items-center gap-2">
        <Star size={14} color="#534AB7" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>
          Pesquisa de Satisfação
        </span>
      </div>

      {/* Nota */}
      <div>
        <Label style={{ fontSize: 11, color: "#6B7A90" }}>Nota</Label>
        <div className="flex items-center gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setNota(s)}
              className="hover:scale-110 transition-transform"
            >
              <Star
                size={24}
                fill={s <= nota ? "#E8A020" : "none"}
                color={s <= nota ? "#E8A020" : "#E8ECF2"}
              />
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
          placeholder="Comentário do cliente..."
          rows={3}
          style={{ fontSize: 13, marginTop: 4 }}
        />
      </div>

      {/* Recomendaria */}
      <div>
        <Label style={{ fontSize: 11, color: "#6B7A90" }}>Recomendaria?</Label>
        <div className="flex gap-2 mt-1">
          <Button
            size="sm"
            variant={recomendaria === true ? "default" : "outline"}
            onClick={() => setRecomendaria(true)}
            style={{ fontSize: 12 }}
          >
            Sim
          </Button>
          <Button
            size="sm"
            variant={recomendaria === false ? "default" : "outline"}
            onClick={() => setRecomendaria(false)}
            style={{ fontSize: 12 }}
          >
            Não
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => enviarMutation.mutate()}
          disabled={nota === 0 || enviarMutation.isPending}
          className="gap-1.5"
          style={{ fontSize: 12 }}
        >
          <Send size={13} />
          {enviarMutation.isPending ? "Salvando..." : "Registrar"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowForm(false)}
          style={{ fontSize: 12 }}
        >
          Cancelar
        </Button>
        {clienteContato && (
          <a
            href={gerarLinkWhatsApp() ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto"
          >
            <Button size="sm" variant="outline" className="gap-1.5" style={{ fontSize: 12 }}>
              <ExternalLink size={13} />
              Enviar via WhatsApp
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

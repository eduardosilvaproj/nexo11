import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle, Send, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type TemplateType = "agendamento" | "a_caminho";

const TEMPLATES: Record<TemplateType, string> = {
  agendamento:
    "Olá {nome}! Sua entrega está agendada para {data} no período da {turno}. Qualquer dúvida estamos à disposição.",
  a_caminho:
    "Olá {nome}! Informamos que sua entrega está a caminho. Previsão de chegada: {turno}.",
};

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  agendamento: "Agendamento",
  a_caminho: "A caminho",
};

const TURNO_LABELS: Record<string, string> = {
  manha: "manhã",
  tarde: "tarde",
  dia_todo: "manhã/tarde",
};

function formatPhone(contato: string): string {
  // Remove tudo que não é dígito
  const digits = contato.replace(/\D/g, "");
  // Se não começa com 55, adiciona código do Brasil
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

interface Props {
  entregaId: string;
  clienteNome: string;
  clienteContato: string | null;
  dataPrevista: string;
  turno: string;
}

export function NotificacaoCliente({
  entregaId,
  clienteNome,
  clienteContato,
  dataPrevista,
  turno,
}: Props) {
  const { perfil, user } = useAuth();
  const lojaId = perfil?.loja_id;
  const [template, setTemplate] = useState<TemplateType>("agendamento");
  const [showPreview, setShowPreview] = useState(false);

  const turnoLabel = TURNO_LABELS[turno] ?? turno;
  const dataFormatada = dataPrevista ? formatDate(dataPrevista) : "—";

  const message = TEMPLATES[template]
    .replace("{nome}", clienteNome)
    .replace("{data}", dataFormatada)
    .replace("{turno}", turnoLabel);

  const logMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("logistica_notificacoes")
        .insert({
          entrega_id: entregaId,
          loja_id: lojaId,
          tipo: template,
          destinatario: clienteContato,
          mensagem: message,
          enviado_por: user?.id,
        });
      if (error) throw error;
    },
    onError: () => {
      // Log silently - the WhatsApp was already opened
      console.error("Erro ao registrar notificação");
    },
  });

  function handleSend() {
    if (!clienteContato) {
      toast.error("Cliente sem contato cadastrado");
      return;
    }

    const phone = formatPhone(clienteContato);
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${encoded}`;

    window.open(url, "_blank");
    logMutation.mutate();
    toast.success("WhatsApp aberto com a mensagem");
  }

  return (
    <div
      className="rounded-xl bg-card p-5 space-y-3"
      style={{ border: "0.5px solid #E8ECF2" }}
    >
      <div className="flex items-center gap-2">
        <MessageCircle size={14} style={{ color: "#25D366" }} />
        <h3 className="text-[13px] font-semibold" style={{ color: "#0D1117" }}>
          Notificar Cliente
        </h3>
      </div>

      <div className="flex gap-2 items-center">
        <Select
          value={template}
          onValueChange={(v) => {
            setTemplate(v as TemplateType);
            setShowPreview(false);
          }}
        >
          <SelectTrigger className="w-[180px] text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TEMPLATES) as TemplateType[]).map((key) => (
              <SelectItem key={key} value={key} className="text-[13px]">
                {TEMPLATE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="text-[13px] gap-1"
        >
          <Eye size={14} />
          {showPreview ? "Ocultar" : "Preview"}
        </Button>
      </div>

      {showPreview && (
        <div
          className="rounded-lg p-3 text-[13px]"
          style={{
            backgroundColor: "#DCF8C6",
            color: "#0D1117",
            border: "0.5px solid #B8E6A0",
          }}
        >
          {message}
        </div>
      )}

      {!clienteContato && (
        <p className="text-[11px]" style={{ color: "#F59E0B" }}>
          Cliente sem número de contato cadastrado.
        </p>
      )}

      <Button
        size="sm"
        onClick={handleSend}
        disabled={!clienteContato}
        className="text-[13px] gap-1.5"
        style={{ backgroundColor: "#25D366" }}
      >
        <Send size={14} />
        Enviar via WhatsApp
      </Button>
    </div>
  );
}

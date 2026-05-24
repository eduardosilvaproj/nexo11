import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Send, 
  Copy, 
  ExternalLink, 
  Loader2, 
  Mail, 
  Smartphone 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Canal = "whatsapp" | "email" | "manual" | "whatsapp_oficial" | "email_oficial";
type TipoMensagem = 
  | "portal_link" 
  | "documento" 
  | "assinatura_pendente" 
  | "entrega_agendada" 
  | "montagem_agendada" 
  | "pos_venda" 
  | "satisfacao"
  | "aviso_geral";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string;
  clienteId?: string | null;
  lojaId: string;
}

export function ComunicacaoClienteDialog({ open, onOpenChange, contratoId, clienteId, lojaId }: Props) {
  const qc = useQueryClient();
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [tipo, setTipo] = useState<TipoMensagem>("portal_link");
  const [destinatario, setDestinatario] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [documentoId, setDocumentoId] = useState<string | null>(null);

  // Load Contract Data
  const { data: contrato } = useQuery({
    queryKey: ["contrato_comunicacao", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*, loja:lojas(*)")
        .eq("id", contratoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Load Active Portal Token
  const { data: portalToken } = useQuery({
    queryKey: ["portal_token_active", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_tokens")
        .select("*")
        .eq("contrato_id", contratoId)
        .eq("revogado", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Load Documents Visible to Client
  const { data: documentos } = useQuery({
    queryKey: ["documentos_cliente", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_emitidos")
        .select("*")
        .eq("contrato_id", contratoId)
        .eq("visivel_cliente", true)
        .eq("status", "emitido");
      if (error) throw error;
      return data;
    },
    enabled: open && tipo === "documento",
  });

  // Logistics info
  const { data: agendamentos } = useQuery({
    queryKey: ["agendamentos_comunicacao", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos_montagem")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("data_agendamento", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && (tipo === "entrega_agendada" || tipo === "montagem_agendada"),
  });

  // Generate Message based on template
  useMemo(() => {
    if (!contrato) return;

    const portalLink = portalToken 
      ? `${window.location.origin}/portal/${portalToken.token}`
      : "[Gere o link do portal primeiro]";
    
    const vars = {
      cliente_nome: contrato.cliente_nome,
      contrato_numero: contrato.id.slice(0, 8),
      loja_nome: (contrato as any).loja?.nome || "NEXO",
      portal_link: portalLink,
    };

    let msg = "";
    switch (tipo) {
      case "portal_link":
        msg = `Olá ${vars.cliente_nome}! Aqui está o link do seu Portal do Cliente na ${vars.loja_nome}: ${vars.portal_link}. Por lá você acompanha todo o andamento do seu projeto.`;
        break;
      case "documento":
        const doc = documentos?.find(d => d.id === documentoId);
        msg = `Olá ${vars.cliente_nome}! Um novo documento (${doc?.titulo || "projeto/comercial"}) está disponível para visualização no seu portal: ${vars.portal_link}`;
        break;
      case "assinatura_pendente":
        msg = `Olá ${vars.cliente_nome}! Temos uma solicitação de assinatura pendente no seu portal. Por favor, acesse e realize o aceite digital: ${vars.portal_link}`;
        break;
      case "entrega_agendada":
        const entrega = agendamentos?.find(a => (a as any).tipo === "entrega") || agendamentos?.[0];
        const dataE = entrega ? format(new Date(entrega.data), "dd/MM/yyyy") : "[data]";
        msg = `Olá ${vars.cliente_nome}! Sua entrega foi agendada para o dia ${dataE}. Detalhes no seu portal: ${vars.portal_link}`;
        break;
      case "montagem_agendada":
        const montagem = agendamentos?.find(a => (a as any).tipo === "montagem") || agendamentos?.[0];
        const dataM = montagem ? format(new Date(montagem.data), "dd/MM/yyyy") : "[data]";
        msg = `Olá ${vars.cliente_nome}! Sua montagem foi agendada para o dia ${dataM}. Detalhes no seu portal: ${vars.portal_link}`;
        break;
      case "pos_venda":
        msg = `Olá ${vars.cliente_nome}! Atualizamos o seu chamado de pós-venda. Confira as novidades no seu portal: ${vars.portal_link}`;
        break;
      case "satisfacao":
        msg = `Olá ${vars.cliente_nome}! Queremos muito saber sua opinião sobre o nosso atendimento. Responda nossa pesquisa rápida pelo link: ${vars.portal_link}`;
        break;
      case "aviso_geral":
        msg = `Olá ${vars.cliente_nome}! Temos uma atualização sobre seu contrato ${vars.contrato_numero}. Acesse o portal para mais detalhes: ${vars.portal_link}`;
        break;
    }

    setMensagem(msg);
    if (!destinatario && contrato.cliente_contato) {
      setDestinatario(contrato.cliente_contato);
    }
  }, [tipo, contrato, portalToken, documentoId, documentos, agendamentos]);

  const registrarComunicacao = useMutation({
    mutationFn: async (status: string = "enviado") => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const finalLojaId = lojaId || contrato?.loja_id;
      if (!finalLojaId) throw new Error("ID da loja não encontrado");

      // Se canal oficial, status começa como 'preparado' para a outbox
      const statusCom = (canal === "whatsapp_oficial" || canal === "email_oficial") ? "preparado" : status;

      const { data: comunicacao, error } = await supabase
        .from("cliente_comunicacoes")
        .insert({
          loja_id: finalLojaId,
          cliente_id: clienteId || contrato?.cliente_id,
          contrato_id: contratoId,
          portal_token_id: portalToken?.id,
          canal: canal.replace("_oficial", ""), // normaliza para a tabela existente
          tipo,
          destinatario,
          mensagem,
          status: statusCom,
          enviado_por: user?.id,
          enviado_em: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Se canal oficial, criar entrada na outbox
      if (canal === "whatsapp_oficial" || canal === "email_oficial") {
        const { error: errorOutbox } = await supabase
          .from("communication_outbox")
          .insert({
            loja_id: finalLojaId,
            cliente_id: clienteId || contrato?.cliente_id,
            contrato_id: contratoId,
            comunicacao_id: comunicacao.id,
            canal: canal.replace("_oficial", ""),
            destinatario,
            mensagem,
            status: "pendente",
            created_by: user?.id
          } as any);
        
        if (errorOutbox) console.error("Erro ao criar outbox:", errorOutbox);
      }

      // Registrar na timeline
      const { registrarEventoContrato } = await import("@/services/contratoEventos");
      await registrarEventoContrato({
        contratoId,
        tipo: "comunicacao",
        modulo: "comercial",
        titulo: `Comunicação enviada (${canal})`,
        descricao: `Tipo: ${tipo.replace(/_/g, " ")}. Destinatário: ${destinatario}`,
        visivelCliente: true
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente_comunicacoes", contratoId] });
      qc.invalidateQueries({ queryKey: ["contrato_eventos", contratoId] });
      toast.success("Comunicação registrada com sucesso!");
    },
  });

  const handleSend = async () => {
    // If it's a satisfaction survey, ensure a record is created in cliente_pesquisas first
    if (tipo === "satisfacao") {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("cliente_pesquisas").insert({
          loja_id: lojaId || contrato?.loja_id,
          cliente_id: clienteId || contrato?.cliente_id,
          contrato_id: contratoId,
          portal_token_id: portalToken?.id,
          etapa: "geral",
          status: "enviada",
          enviada_por: user?.id,
        });
        if (error) throw error;
      } catch (e: any) {
        toast.error("Erro ao criar registro de pesquisa: " + e.message);
        return;
      }
    }

    if (canal === "whatsapp") {
      const phone = destinatario.replace(/\D/g, "");
      const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(mensagem)}`;
      window.open(url, "_blank");
      registrarComunicacao.mutate("enviado");
    } else if (canal === "whatsapp_oficial" || canal === "email_oficial") {
      registrarComunicacao.mutate("preparado");
    } else {
      // Logic for email or manual
      registrarComunicacao.mutate("enviado");
    }
    onOpenChange(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mensagem);
    toast.success("Mensagem copiada!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            Comunicar Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={canal} onValueChange={(v: any) => setCanal(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" /> WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> E-mail (Manual)
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">Registro Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Mensagem</Label>
              <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portal_link">Link do Portal</SelectItem>
                  <SelectItem value="documento">Novo Documento</SelectItem>
                  <SelectItem value="assinatura_pendente">Assinatura Pendente</SelectItem>
                  <SelectItem value="entrega_agendada">Lembrete de Entrega</SelectItem>
                  <SelectItem value="montagem_agendada">Lembrete de Montagem</SelectItem>
                  <SelectItem value="pos_venda">Pós-venda</SelectItem>
                  <SelectItem value="satisfacao">Pesquisa de Satisfação</SelectItem>
                  <SelectItem value="aviso_geral">Aviso Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Destinatário (Telefone/E-mail)</Label>
            <div className="flex gap-2">
              <input 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                placeholder="Ex: 11999999999"
              />
            </div>
          </div>

          {tipo === "documento" && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <Label>Selecionar Documento Liberado</Label>
              <Select value={documentoId || ""} onValueChange={setDocumentoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um documento" />
                </SelectTrigger>
                <SelectContent>
                  {documentos?.map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>{doc.titulo}</SelectItem>
                  ))}
                  {(!documentos || documentos.length === 0) && (
                    <div className="p-2 text-xs text-muted-foreground">Nenhum documento visível ao cliente.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Prévia da Mensagem</Label>
            <Textarea 
              value={mensagem} 
              onChange={(e) => setMensagem(e.target.value)}
              className="h-32 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={copyToClipboard}>
            <Copy className="w-4 h-4 mr-2" /> Copiar
          </Button>
          <Button 
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700" 
            onClick={handleSend}
            disabled={!destinatario || !portalToken || registrarComunicacao.isPending}
          >
            {registrarComunicacao.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              canal === "whatsapp" ? <MessageSquare className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />
            )}
            {canal === "whatsapp" ? "Abrir WhatsApp" : "Registrar Envio"}
          </Button>
        </DialogFooter>
        {!portalToken && (
          <p className="text-[10px] text-red-500 text-center">
            Atenção: É necessário ativar o acesso ao portal para enviar comunicações.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

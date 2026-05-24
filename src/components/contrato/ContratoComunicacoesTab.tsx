import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User,
  History,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  contratoId: string;
}

export function ContratoComunicacoesTab({ contratoId }: Props) {
  const { data: comunicacoes, isLoading } = useQuery({
    queryKey: ["cliente_comunicacoes", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_comunicacoes")
        .select(`
          *,
          enviado_por_user:usuarios!cliente_comunicacoes_enviado_por_fkey(nome),
          outbox:communication_outbox(id, status, erro, enviado_em)
        `)
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!comunicacoes || comunicacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-slate-50 text-slate-500">
        <History className="w-10 h-10 mb-3 opacity-20" />
        <p className="text-sm">Nenhuma comunicação registrada para este contrato.</p>
      </div>
    );
  }

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case "whatsapp": return <Smartphone className="w-4 h-4 text-green-500" />;
      case "email": return <Mail className="w-4 h-4 text-blue-500" />;
      default: return <MessageSquare className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enviado":
      case "entregue":
      case "lido":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none flex gap-1 items-center">
          <CheckCircle2 className="w-3 h-3" /> {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>;
      case "falhou":
        return <Badge variant="destructive" className="flex gap-1 items-center">
          <AlertCircle className="w-3 h-3" /> Falhou
        </Badge>;
      case "ignorado":
        return <Badge variant="outline" className="text-muted-foreground flex gap-1 items-center">
          <XCircle className="w-3 h-3" /> Opt-out
        </Badge>;
      case "pendente":
      case "preparado":
        return <Badge variant="secondary" className="flex gap-1 items-center">
          <Clock className="w-3 h-3" /> Pendente
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Histórico de Comunicações</h3>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {comunicacoes.map((comm) => (
            <Card key={comm.id} className="overflow-hidden border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      {getCanalIcon(comm.canal)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 capitalize">
                          {comm.tipo.replace(/_/g, " ")}
                        </span>
                        {getStatusBadge(comm.status)}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                        <span>{comm.destinatario}</span>
                        <span>•</span>
                        <span>{format(new Date(comm.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <User className="w-3 h-3" />
                    {(comm as any).enviado_por_user?.nome || "Sistema"}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap italic">
                  "{comm.mensagem}"
                </div>

                {comm.erro && (
                  <div className="mt-2 text-[10px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {comm.erro}
                  </div>
                )}

                {(comm as any).outbox?.[0] && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">Status Oficial:</span>
                      {getStatusBadge((comm as any).outbox[0].status)}
                    </div>
                    {(comm as any).outbox[0].enviado_em && (
                      <span className="text-[10px] text-slate-400">
                        Processado em: {format(new Date((comm as any).outbox[0].enviado_em), "dd/MM HH:mm")}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

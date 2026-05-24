import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  History, 
  Settings2, 
  RefreshCw, 
  XCircle, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ExternalLink,
  MessageSquare,
  Mail,
  Smartphone,
  Eye,
  Filter,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CentralComunicacao() {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id;
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("outbox");
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Query Outbox
  const { data: outbox = [], isLoading: loadingOutbox } = useQuery({
    queryKey: ["communication_outbox", lojaId, statusFilter],
    enabled: !!lojaId,
    queryFn: async () => {
      let query = supabase
        .from("communication_outbox")
        .select(`
          *,
          cliente:clientes(nome),
          contrato:contratos(id)
        `)
        .eq("loja_id", lojaId!)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Query Settings
  const { data: settings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ["communication_settings", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communication_settings")
        .select("*")
        .eq("loja_id", lojaId!);
      if (error) throw error;
      return data;
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("communication_outbox")
        .update({ status: "pendente", tentativas: 0, erro: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem agendada para reenvio");
      qc.invalidateQueries({ queryKey: ["communication_outbox"] });
    },
    onError: (err: any) => toast.error("Erro ao reprocessar: " + err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("communication_outbox")
        .update({ status: "cancelado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem cancelada");
      qc.invalidateQueries({ queryKey: ["communication_outbox"] });
    },
    onError: (err: any) => toast.error("Erro ao cancelar: " + err.message),
  });

  const filteredOutbox = outbox.filter(msg => 
    msg.destinatario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (msg.cliente as any)?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (msg.contrato as any)?.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enviado": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Enviado</Badge>;
      case "entregue": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Entregue</Badge>;
      case "lido": return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">Lido</Badge>;
      case "pendente": return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case "processando": return <Badge variant="secondary" className="animate-pulse">Processando</Badge>;
      case "falhou": return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Falhou</Badge>;
      case "cancelado": return <Badge variant="outline" className="text-muted-foreground">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case "whatsapp": return <MessageSquare className="h-4 w-4 text-green-600" />;
      case "email": return <Mail className="h-4 w-4 text-blue-600" />;
      case "sms": return <Smartphone className="h-4 w-4 text-orange-600" />;
      default: return <Send className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!lojaId) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Send className="h-6 w-6 text-primary" />
            Central de Comunicação & Envios
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe a fila de comunicações oficiais e configure seus canais de envio.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="outbox" className="gap-2">
            <History className="h-4 w-4" />
            Fila de Envios
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Canais & Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outbox" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <CardTitle>Histórico e Fila</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar destinatário, cliente..." 
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="falhou">Falhou</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => qc.invalidateQueries({ queryKey: ["communication_outbox"] })}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Cliente / Contrato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutbox.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="text-xs">
                        {format(new Date(msg.created_at!), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCanalIcon(msg.canal)}
                          <span className="text-xs capitalize">{msg.canal}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {msg.destinatario}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{msg.cliente?.nome_completo || "N/A"}</span>
                          <span className="text-[10px] text-muted-foreground">Contrato: {msg.contrato?.numero || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(msg.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedMsg(msg)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {msg.status === "falhou" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-primary"
                              onClick={() => retryMutation.mutate(msg.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          {(msg.status === "pendente" || msg.status === "falhou") && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => cancelMutation.mutate(msg.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredOutbox.length === 0 && !loadingOutbox && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Nenhuma mensagem encontrada na fila.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {['whatsapp', 'email', 'sms'].map((canal) => {
              const config = settings.find(s => s.canal === canal);
              return (
                <Card key={canal} className={!config?.ativo ? "opacity-70" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {getCanalIcon(canal)}
                        <CardTitle className="text-lg capitalize">{canal}</CardTitle>
                      </div>
                      <Badge variant={config?.ativo ? "default" : "secondary"}>
                        {config?.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {config?.provider ? `Provedor: ${config.provider}` : "Canal não configurado"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {config ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Remetente:</span>
                          <span className="font-medium">{config.remetente || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Horário:</span>
                          <span className="font-medium">
                            {config.horario_inicio && config.horario_fim 
                              ? `${config.horario_inicio.slice(0,5)} - ${config.horario_fim.slice(0,5)}`
                              : "Livre"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Limite diário:</span>
                          <span className="font-medium">{config.limite_diario || "Ilimitado"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        Aguardando integração oficial
                      </div>
                    )}
                    <Button variant="outline" className="w-full gap-2" onClick={() => toast.info("Funcionalidade de configuração em breve")}>
                      <Settings2 className="h-4 w-4" />
                      Configurar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h4 className="font-medium">Pronto para Integração Oficial</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Esta camada está pronta para receber as chaves de API do WhatsApp Business ou Amazon SES.
                    Fale com o suporte do NEXO para ativar o envio automático em larga escala.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Details Dialog */}
      <Dialog open={!!selectedMsg} onOpenChange={() => setSelectedMsg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes da Comunicação
              {selectedMsg && getStatusBadge(selectedMsg.status)}
            </DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Canal / Provedor</span>
                  <p className="font-medium capitalize">{selectedMsg.canal} ({selectedMsg.provider || "Manual"})</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Destinatário</span>
                  <p className="font-medium">{selectedMsg.destinatario}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Cliente</span>
                  <p className="font-medium">{selectedMsg.cliente?.nome_completo || "Não identificado"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Template</span>
                  <p className="font-medium">{selectedMsg.template_key || "Texto livre"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Mensagem Enviada</span>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/30">
                  <div className="whitespace-pre-wrap text-sm">
                    {selectedMsg.mensagem}
                  </div>
                </ScrollArea>
              </div>

              {selectedMsg.erro && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Log de Erro:</span>
                    <p className="mt-1 font-mono text-xs">{selectedMsg.erro}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <div className="flex gap-4">
                  <span>Criado: {format(new Date(selectedMsg.created_at), "dd/MM HH:mm:ss")}</span>
                  {selectedMsg.enviado_em && (
                    <span>Enviado: {format(new Date(selectedMsg.enviado_em), "dd/MM HH:mm:ss")}</span>
                  )}
                </div>
                {selectedMsg.provider_message_id && (
                  <span>ID Provedor: {selectedMsg.provider_message_id}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

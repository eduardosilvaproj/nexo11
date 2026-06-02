import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  History,
  FileText,
  Zap,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

// Types
interface Automacao {
  id: string;
  nome: string;
  gatilho: string;
  gatilho_descricao: string;
  template_mensagem: string;
  antecedencia_valor: number;
  antecedencia_unidade: string;
  ativo: boolean;
  mensagens_enviadas: number;
  ultimo_disparo: string | null;
}

interface HistoricoMsg {
  id: string;
  data_hora: string;
  destinatario: string;
  automacao_nome: string;
  status: "enviado" | "entregue" | "lido" | "erro";
  mensagem_preview: string;
}

interface Template {
  id: string;
  nome: string;
  mensagem: string;
  variaveis: string[];
}

// Demo data
const demoAutomacoes: Automacao[] = [
  {
    id: "1",
    nome: "Lembrete de Entrega",
    gatilho: "antes_entrega",
    gatilho_descricao: "24h antes da entrega",
    template_mensagem: "Olá {cliente}! Sua entrega está agendada para amanhã ({data}), turno da {turno}. Confirma?",
    antecedencia_valor: 24,
    antecedencia_unidade: "horas",
    ativo: true,
    mensagens_enviadas: 142,
    ultimo_disparo: "2026-05-31T14:30:00",
  },
  {
    id: "2",
    nome: "Confirmação de Montagem",
    gatilho: "montagem_agendada",
    gatilho_descricao: "Quando montagem agendada",
    template_mensagem: "Olá {cliente}! Sua montagem foi agendada para {data} às {hora}. Equipe: {equipe}.",
    antecedencia_valor: 0,
    antecedencia_unidade: "imediato",
    ativo: true,
    mensagens_enviadas: 89,
    ultimo_disparo: "2026-05-30T09:15:00",
  },
  {
    id: "3",
    nome: "Cobrança de Parcela",
    gatilho: "vencimento_parcela",
    gatilho_descricao: "3 dias antes do vencimento",
    template_mensagem: "Olá {cliente}! Lembrete: parcela de R$ {valor} vence em {data}. Pix/Boleto disponível.",
    antecedencia_valor: 3,
    antecedencia_unidade: "dias",
    ativo: true,
    mensagens_enviadas: 234,
    ultimo_disparo: "2026-05-31T08:00:00",
  },
  {
    id: "4",
    nome: "Pesquisa de Satisfação",
    gatilho: "pos_montagem",
    gatilho_descricao: "7 dias após montagem concluída",
    template_mensagem: "Olá {cliente}! Como foi a experiência? De 0 a 10, qual nota você dá?",
    antecedencia_valor: 7,
    antecedencia_unidade: "dias",
    ativo: false,
    mensagens_enviadas: 56,
    ultimo_disparo: "2026-05-28T10:00:00",
  },
  {
    id: "5",
    nome: "Follow-up Lead",
    gatilho: "lead_sem_resposta",
    gatilho_descricao: "2 dias sem resposta",
    template_mensagem: "Olá {nome}! Vi que você demonstrou interesse. Posso ajudar com alguma dúvida?",
    antecedencia_valor: 2,
    antecedencia_unidade: "dias",
    ativo: true,
    mensagens_enviadas: 67,
    ultimo_disparo: "2026-05-31T11:45:00",
  },
  {
    id: "6",
    nome: "Atualização de Status",
    gatilho: "mudanca_etapa",
    gatilho_descricao: "Quando contrato muda de etapa",
    template_mensagem: "Olá {cliente}! Seu projeto avançou para a etapa: {etapa}.",
    antecedencia_valor: 0,
    antecedencia_unidade: "imediato",
    ativo: true,
    mensagens_enviadas: 178,
    ultimo_disparo: "2026-05-31T16:20:00",
  },
];

const demoHistorico: HistoricoMsg[] = [
  { id: "h1", data_hora: "2026-05-31T16:20:00", destinatario: "Maria Silva", automacao_nome: "Atualização de Status", status: "entregue", mensagem_preview: "Olá Maria! Seu projeto avançou para a etapa: Montagem." },
  { id: "h2", data_hora: "2026-05-31T14:30:00", destinatario: "João Oliveira", automacao_nome: "Lembrete de Entrega", status: "lido", mensagem_preview: "Olá João! Sua entrega está agendada para amanhã (01/06), turno da manhã. Confirma?" },
  { id: "h3", data_hora: "2026-05-31T11:45:00", destinatario: "Ana Costa", automacao_nome: "Follow-up Lead", status: "enviado", mensagem_preview: "Olá Ana! Vi que você demonstrou interesse. Posso ajudar com alguma dúvida?" },
  { id: "h4", data_hora: "2026-05-31T08:00:00", destinatario: "Carlos Mendes", automacao_nome: "Cobrança de Parcela", status: "entregue", mensagem_preview: "Olá Carlos! Lembrete: parcela de R$ 1.250,00 vence em 03/06. Pix/Boleto disponível." },
  { id: "h5", data_hora: "2026-05-30T09:15:00", destinatario: "Fernanda Lima", automacao_nome: "Confirmação de Montagem", status: "lido", mensagem_preview: "Olá Fernanda! Sua montagem foi agendada para 02/06 às 08:00. Equipe: Equipe A." },
  { id: "h6", data_hora: "2026-05-29T10:00:00", destinatario: "Roberto Alves", automacao_nome: "Pesquisa de Satisfação", status: "erro", mensagem_preview: "Olá Roberto! Como foi a experiência? De 0 a 10, qual nota você dá?" },
  { id: "h7", data_hora: "2026-05-29T08:30:00", destinatario: "Paula Santos", automacao_nome: "Lembrete de Entrega", status: "entregue", mensagem_preview: "Olá Paula! Sua entrega está agendada para amanhã (30/05), turno da tarde. Confirma?" },
  { id: "h8", data_hora: "2026-05-28T15:00:00", destinatario: "Lucas Ferreira", automacao_nome: "Cobrança de Parcela", status: "lido", mensagem_preview: "Olá Lucas! Lembrete: parcela de R$ 890,00 vence em 31/05. Pix/Boleto disponível." },
];

const demoTemplates: Template[] = [
  { id: "t1", nome: "Lembrete de Entrega", mensagem: "Olá {cliente}! Sua entrega está agendada para amanhã ({data}), turno da {turno}. Confirma?", variaveis: ["cliente", "data", "turno"] },
  { id: "t2", nome: "Confirmação de Montagem", mensagem: "Olá {cliente}! Sua montagem foi agendada para {data} às {hora}. Equipe: {equipe}.", variaveis: ["cliente", "data", "hora", "equipe"] },
  { id: "t3", nome: "Cobrança de Parcela", mensagem: "Olá {cliente}! Lembrete: parcela de R$ {valor} vence em {data}. Pix/Boleto disponível.", variaveis: ["cliente", "valor", "data"] },
  { id: "t4", nome: "Pesquisa de Satisfação", mensagem: "Olá {cliente}! Como foi a experiência? De 0 a 10, qual nota você dá?", variaveis: ["cliente"] },
  { id: "t5", nome: "Follow-up Lead", mensagem: "Olá {nome}! Vi que você demonstrou interesse. Posso ajudar com alguma dúvida?", variaveis: ["nome"] },
  { id: "t6", nome: "Atualização de Status", mensagem: "Olá {cliente}! Seu projeto avançou para a etapa: {etapa}.", variaveis: ["cliente", "etapa"] },
];

const gatilhoOptions = [
  { value: "antes_entrega", label: "Antes da entrega" },
  { value: "montagem_agendada", label: "Montagem agendada" },
  { value: "vencimento_parcela", label: "Vencimento de parcela" },
  { value: "pos_montagem", label: "Pós-montagem" },
  { value: "lead_sem_resposta", label: "Lead sem resposta" },
  { value: "mudanca_etapa", label: "Mudança de etapa" },
];

function StatusBadgeWhatsapp({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    enviado: { label: "Enviado", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    entregue: { label: "Entregue", className: "bg-green-100 text-green-800 border-green-200" },
    lido: { label: "Lido", className: "bg-blue-100 text-blue-800 border-blue-200" },
    erro: { label: "Erro", className: "bg-red-100 text-red-800 border-red-200" },
  };
  const c = config[status] || config.enviado;
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

function ChatBubble({ message }: { message: string }) {
  return (
    <div className="relative bg-[#25D366] text-white rounded-lg rounded-tl-none px-3 py-2 text-sm max-w-xs shadow-sm">
      <div className="absolute -top-0 -left-2 w-0 h-0 border-t-[8px] border-t-[#25D366] border-l-[8px] border-l-transparent" />
      {message}
      <div className="text-[10px] text-white/70 text-right mt-1">16:20</div>
    </div>
  );
}

function PhoneMockup({ message }: { message: string }) {
  return (
    <div className="w-[260px] mx-auto">
      <div className="bg-gray-900 rounded-[2rem] p-2 shadow-xl">
        <div className="bg-white rounded-[1.5rem] overflow-hidden">
          {/* Phone header */}
          <div className="bg-[#075E54] px-4 py-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-white text-xs font-medium">Sua Empresa</p>
              <p className="text-green-200 text-[10px]">online</p>
            </div>
          </div>
          {/* Chat area */}
          <div className="bg-[#ECE5DD] p-3 min-h-[280px] flex flex-col justify-end">
            <div className="mb-2">
              <ChatBubble message={message || "Prévia da mensagem aparecerá aqui..."} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AutomacaoWhatsapp() {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id;

  const [activeTab, setActiveTab] = useState("automacoes");
  const [statsPeriod, setStatsPeriod] = useState<"hoje" | "semana" | "mes">("semana");
  const [automacoes, setAutomacoes] = useState<Automacao[]>(demoAutomacoes);
  const [historico] = useState<HistoricoMsg[]>(demoHistorico);
  const [templates, setTemplates] = useState<Template[]>(demoTemplates);

  // Dialog states
  const [novaAutomacaoOpen, setNovaAutomacaoOpen] = useState(false);
  const [novoTemplateOpen, setNovoTemplateOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);

  // Nova automacao form
  const [formNome, setFormNome] = useState("");
  const [formGatilho, setFormGatilho] = useState("");
  const [formMensagem, setFormMensagem] = useState("");
  const [formAntecedencia, setFormAntecedencia] = useState(1);
  const [formUnidade, setFormUnidade] = useState("dias");
  const [formAtivo, setFormAtivo] = useState(true);

  // Template form
  const [templateNome, setTemplateNome] = useState("");
  const [templateMensagem, setTemplateMensagem] = useState("");

  // Historico filters
  const [filtroAutomacao, setFiltroAutomacao] = useState("all");

  // Try fetching from supabase (gracefully handles missing tables)
  useQuery({
    queryKey: ["whatsapp_automacoes", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_automacoes")
        .select("*")
        .eq("loja_id", lojaId);
      if (error || !data?.length) return [];
      return data;
    },
  });

  // Stats calculations
  const statsData = {
    hoje: { enviadas: 18, taxa_entrega: 94, respostas: 7, ativas: automacoes.filter(a => a.ativo).length },
    semana: { enviadas: 127, taxa_entrega: 91, respostas: 43, ativas: automacoes.filter(a => a.ativo).length },
    mes: { enviadas: 534, taxa_entrega: 89, respostas: 156, ativas: automacoes.filter(a => a.ativo).length },
  };
  const stats = statsData[statsPeriod];

  const toggleAutomacao = (id: string) => {
    setAutomacoes(prev => prev.map(a => a.id === id ? { ...a, ativo: !a.ativo } : a));
    toast.success("Status da automação atualizado");
  };

  const handleNovaAutomacao = () => {
    if (!formNome || !formGatilho || !formMensagem) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const nova: Automacao = {
      id: Date.now().toString(),
      nome: formNome,
      gatilho: formGatilho,
      gatilho_descricao: gatilhoOptions.find(g => g.value === formGatilho)?.label || formGatilho,
      template_mensagem: formMensagem,
      antecedencia_valor: formAntecedencia,
      antecedencia_unidade: formUnidade,
      ativo: formAtivo,
      mensagens_enviadas: 0,
      ultimo_disparo: null,
    };
    setAutomacoes(prev => [...prev, nova]);
    setNovaAutomacaoOpen(false);
    setFormNome(""); setFormGatilho(""); setFormMensagem(""); setFormAntecedencia(1); setFormUnidade("dias"); setFormAtivo(true);
    toast.success("Automação criada com sucesso!");
  };

  const handleNovoTemplate = () => {
    if (!templateNome || !templateMensagem) {
      toast.error("Preencha todos os campos");
      return;
    }
    const vars = templateMensagem.match(/\{(\w+)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];
    const novo: Template = { id: Date.now().toString(), nome: templateNome, mensagem: templateMensagem, variaveis: vars };
    setTemplates(prev => [...prev, novo]);
    setNovoTemplateOpen(false);
    setTemplateNome(""); setTemplateMensagem("");
    toast.success("Template criado com sucesso!");
  };

  const filteredHistorico = filtroAutomacao === "all"
    ? historico
    : historico.filter(h => h.automacao_nome === filtroAutomacao);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: "#0D1117" }}>
            <MessageSquare className="h-6 w-6" style={{ color: "#25D366" }} />
            Automação WhatsApp
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7A90" }}>
            Configure e monitore mensagens automáticas via WhatsApp para comunicação com clientes.
          </p>
        </div>
        <Button
          onClick={() => setNovaAutomacaoOpen(true)}
          className="gap-2 text-white"
          style={{ backgroundColor: "#25D366" }}
        >
          <Plus className="h-4 w-4" />
          Nova Automação
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border" style={{ borderColor: "#E8ECF2" }}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium" style={{ color: "#6B7A90" }}>Mensagens enviadas</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "#0D1117" }}>{stats.enviadas}</p>
              </div>
              <Send className="h-5 w-5" style={{ color: "#25D366" }} />
            </div>
            <div className="flex gap-1 mt-2">
              {(["hoje", "semana", "mes"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setStatsPeriod(p)}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                    statsPeriod === p ? "text-white" : "text-gray-600 bg-gray-100"
                  }`}
                  style={statsPeriod === p ? { backgroundColor: "#25D366" } : {}}
                >
                  {p === "hoje" ? "Hoje" : p === "semana" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border" style={{ borderColor: "#E8ECF2" }}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium" style={{ color: "#6B7A90" }}>Taxa de entrega</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "#0D1117" }}>{stats.taxa_entrega}%</p>
              </div>
              <CheckCircle2 className="h-5 w-5" style={{ color: "#25D366" }} />
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
              <div className="h-1.5 rounded-full" style={{ width: `${stats.taxa_entrega}%`, backgroundColor: "#25D366" }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border" style={{ borderColor: "#E8ECF2" }}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium" style={{ color: "#6B7A90" }}>Respostas recebidas</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "#0D1117" }}>{stats.respostas}</p>
              </div>
              <MessageCircle className="h-5 w-5" style={{ color: "#1E6FBF" }} />
            </div>
            <p className="text-[10px] mt-2" style={{ color: "#6B7A90" }}>
              {Math.round((stats.respostas / stats.enviadas) * 100)}% de taxa de resposta
            </p>
          </CardContent>
        </Card>

        <Card className="border" style={{ borderColor: "#E8ECF2" }}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium" style={{ color: "#6B7A90" }}>Automações ativas</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "#0D1117" }}>{stats.ativas}</p>
              </div>
              <Zap className="h-5 w-5" style={{ color: "#25D366" }} />
            </div>
            <p className="text-[10px] mt-2" style={{ color: "#6B7A90" }}>
              de {automacoes.length} configuradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="automacoes" className="gap-2">
            <Zap className="h-4 w-4" />
            Automações
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Tab Automacoes */}
        <TabsContent value="automacoes" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {automacoes.map((automacao) => (
              <Card
                key={automacao.id}
                className={`border transition-all hover:shadow-md ${!automacao.ativo ? "opacity-60" : ""}`}
                style={{ borderColor: automacao.ativo ? "#25D366" : "#E8ECF2", borderLeftWidth: "3px" }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold" style={{ color: "#0D1117" }}>
                      {automacao.nome}
                    </CardTitle>
                    <Switch
                      checked={automacao.ativo}
                      onCheckedChange={() => toggleAutomacao(automacao.id)}
                    />
                  </div>
                  <CardDescription className="text-xs" style={{ color: "#6B7A90" }}>
                    {automacao.gatilho_descricao}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ChatBubble message={automacao.template_mensagem} />
                  <div className="flex items-center justify-between text-xs" style={{ color: "#6B7A90" }}>
                    <span className="flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      {automacao.mensagens_enviadas} enviadas
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {automacao.ultimo_disparo ? formatDate(automacao.ultimo_disparo) : "Nunca"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab Historico */}
        <TabsContent value="historico" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filtroAutomacao} onValueChange={setFiltroAutomacao}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filtrar por automação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as automações</SelectItem>
                {[...new Set(historico.map(h => h.automacao_nome))].map(nome => (
                  <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border" style={{ borderColor: "#E8ECF2" }}>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Automação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistorico.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8" style={{ color: "#6B7A90" }}>
                        Nenhum dado ainda
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistorico.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(msg.data_hora)}</TableCell>
                        <TableCell className="text-sm font-medium">{msg.destinatario}</TableCell>
                        <TableCell className="text-xs">{msg.automacao_nome}</TableCell>
                        <TableCell><StatusBadgeWhatsapp status={msg.status} /></TableCell>
                        <TableCell className="hidden md:table-cell text-xs max-w-[200px] truncate" style={{ color: "#6B7A90" }}>
                          {msg.mensagem_preview}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Templates */}
        <TabsContent value="templates" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setNovoTemplateOpen(true)}
              variant="outline"
              className="gap-2"
              style={{ borderColor: "#25D366", color: "#25D366" }}
            >
              <Plus className="h-4 w-4" />
              Novo Template
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="border hover:shadow-md transition-all" style={{ borderColor: "#E8ECF2" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold" style={{ color: "#0D1117" }}>
                    {template.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ChatBubble message={template.mensagem} />
                  <div className="flex flex-wrap gap-1">
                    {template.variaveis.map(v => (
                      <Badge key={v} variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                        {`{${v}}`}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    style={{ color: "#1E6FBF" }}
                    onClick={() => {
                      setEditTemplateId(template.id);
                      setTemplateNome(template.nome);
                      setTemplateMensagem(template.mensagem);
                      setNovoTemplateOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Nova Automação */}
      <Dialog open={novaAutomacaoOpen} onOpenChange={setNovaAutomacaoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#0D1117" }}>
              <Zap className="h-5 w-5" style={{ color: "#25D366" }} />
              Nova Automação
            </DialogTitle>
            <DialogDescription style={{ color: "#6B7A90" }}>
              Configure uma nova regra de automação para mensagens WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da automação</Label>
                <Input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex: Lembrete de Pagamento" />
              </div>
              <div className="space-y-2">
                <Label>Gatilho</Label>
                <Select value={formGatilho} onValueChange={setFormGatilho}>
                  <SelectTrigger><SelectValue placeholder="Selecione o gatilho" /></SelectTrigger>
                  <SelectContent>
                    {gatilhoOptions.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template da mensagem</Label>
                <Textarea
                  value={formMensagem}
                  onChange={e => setFormMensagem(e.target.value)}
                  placeholder="Olá {cliente}! Sua mensagem aqui..."
                  rows={4}
                />
                <p className="text-[10px]" style={{ color: "#6B7A90" }}>
                  Use {"{variáveis}"} para personalizar: {"{cliente}"}, {"{data}"}, {"{valor}"}, {"{etapa}"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Antecedência</Label>
                  <Input type="number" value={formAntecedencia} onChange={e => setFormAntecedencia(Number(e.target.value))} min={0} />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={formUnidade} onValueChange={setFormUnidade}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutos">Minutos</SelectItem>
                      <SelectItem value="horas">Horas</SelectItem>
                      <SelectItem value="dias">Dias</SelectItem>
                      <SelectItem value="imediato">Imediato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formAtivo} onCheckedChange={setFormAtivo} />
                <Label>Ativar imediatamente</Label>
              </div>
              <Button onClick={handleNovaAutomacao} className="w-full text-white" style={{ backgroundColor: "#25D366" }}>
                Criar Automação
              </Button>
            </div>
            <div className="hidden md:flex flex-col items-center justify-center">
              <p className="text-xs mb-3 font-medium" style={{ color: "#6B7A90" }}>Prévia no celular</p>
              <PhoneMockup message={formMensagem} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo/Editar Template */}
      <Dialog open={novoTemplateOpen} onOpenChange={(open) => { setNovoTemplateOpen(open); if (!open) { setEditTemplateId(null); setTemplateNome(""); setTemplateMensagem(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#0D1117" }}>
              <FileText className="h-5 w-5" style={{ color: "#25D366" }} />
              {editTemplateId ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription style={{ color: "#6B7A90" }}>
              Crie ou edite templates de mensagens para suas automações.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do template</Label>
                <Input value={templateNome} onChange={e => setTemplateNome(e.target.value)} placeholder="Ex: Boas-vindas" />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={templateMensagem}
                  onChange={e => setTemplateMensagem(e.target.value)}
                  placeholder="Olá {cliente}! ..."
                  rows={5}
                />
                <p className="text-[10px]" style={{ color: "#6B7A90" }}>
                  Variáveis detectadas automaticamente a partir de {"{chaves}"}
                </p>
              </div>
              {templateMensagem && (
                <div className="space-y-1">
                  <Label className="text-xs">Variáveis detectadas:</Label>
                  <div className="flex flex-wrap gap-1">
                    {(templateMensagem.match(/\{(\w+)\}/g) || []).map(v => (
                      <Badge key={v} variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">{v}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button
                onClick={() => {
                  if (editTemplateId) {
                    const vars = templateMensagem.match(/\{(\w+)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];
                    setTemplates(prev => prev.map(t => t.id === editTemplateId ? { ...t, nome: templateNome, mensagem: templateMensagem, variaveis: vars } : t));
                    toast.success("Template atualizado!");
                    setNovoTemplateOpen(false); setEditTemplateId(null); setTemplateNome(""); setTemplateMensagem("");
                  } else {
                    handleNovoTemplate();
                  }
                }}
                className="w-full text-white"
                style={{ backgroundColor: "#25D366" }}
              >
                {editTemplateId ? "Salvar Alterações" : "Criar Template"}
              </Button>
            </div>
            <div className="hidden md:flex flex-col items-center justify-center">
              <p className="text-xs mb-3 font-medium" style={{ color: "#6B7A90" }}>Prévia no celular</p>
              <PhoneMockup message={templateMensagem} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

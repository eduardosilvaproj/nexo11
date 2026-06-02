import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bell,
  Plus,
  Send,
  Smartphone,
  Laptop,
  Clock,
  CheckCircle2,
  UserPlus,
  FileText,
  Timer,
  Fingerprint,
  Filter,
  ToggleLeft,
  Eye,
  Package,
} from "lucide-react";
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
import { toast } from "sonner";

// Demo data for notification rules
const demoRules = [
  {
    id: "1",
    name: "Nova entrega agendada",
    description: "Notifica montador/motorista quando entrega é criada para ele",
    template: "\u{1F4E6} Nova entrega agendada para {data} - Cliente: {cliente}",
    recipients: ["montador", "motorista"],
    trigger: "entrega_criada",
    active: true,
    lastFired: "2026-06-01T08:30:00",
    icon: Package,
  },
  {
    id: "2",
    name: "Montagem concluída",
    description: "Notifica gerente quando montagem é marcada como concluída",
    template: "✅ Montagem concluída - {cliente} - Equipe {equipe}",
    recipients: ["gerente"],
    trigger: "montagem_concluida",
    active: true,
    lastFired: "2026-06-01T07:45:00",
    icon: CheckCircle2,
  },
  {
    id: "3",
    name: "Lead novo",
    description: "Notifica vendedor quando lead é atribuído",
    template: "\u{1F195} Novo lead: {nome} ({origem}) - Contato: {telefone}",
    recipients: ["vendedor"],
    trigger: "lead_atribuido",
    active: true,
    lastFired: "2026-05-31T16:20:00",
    icon: UserPlus,
  },
  {
    id: "4",
    name: "Aprovação pendente",
    description: "Notifica admin quando contrato precisa aprovação",
    template: "⏳ Contrato aguardando aprovação: {cliente} - R$ {valor}",
    recipients: ["admin"],
    trigger: "contrato_aprovacao",
    active: true,
    lastFired: "2026-05-31T14:10:00",
    icon: FileText,
  },
  {
    id: "5",
    name: "SLA em risco",
    description: "Notifica gerente quando chamado está próximo do prazo",
    template: "⚠️ Chamado #{id} - SLA vence em {horas}h - {cliente}",
    recipients: ["gerente", "tecnico"],
    trigger: "sla_risco",
    active: true,
    lastFired: "2026-05-31T11:00:00",
    icon: Timer,
  },
  {
    id: "6",
    name: "Ponto não registrado",
    description: "Notifica funcionário se não bateu ponto até 9h",
    template: "\u{1F550} Você ainda não registrou entrada hoje. Registre pelo Portal.",
    recipients: ["todos"],
    trigger: "ponto_ausente",
    active: false,
    lastFired: "2026-05-30T09:05:00",
    icon: Fingerprint,
  },
];

// Demo history data
const demoHistory = [
  { id: "h1", timestamp: "2026-06-01T08:30:00", text: "\u{1F4E6} Nova entrega agendada para 02/06 - Cliente: Maria Silva", recipients: ["João (montador)"], status: "delivered", rule: "Nova entrega agendada" },
  { id: "h2", timestamp: "2026-06-01T08:15:00", text: "✅ Montagem concluída - Pedro Santos - Equipe Alpha", recipients: ["Carlos (gerente)"], status: "read", rule: "Montagem concluída" },
  { id: "h3", timestamp: "2026-06-01T07:45:00", text: "\u{1F195} Novo lead: Ana Costa (Instagram) - Contato: (11) 99999-1234", recipients: ["Marcos (vendedor)"], status: "delivered", rule: "Lead novo" },
  { id: "h4", timestamp: "2026-05-31T16:20:00", text: "⏳ Contrato aguardando aprovação: Roberto Lima - R$ 15.800", recipients: ["Admin"], status: "sent", rule: "Aprovação pendente" },
  { id: "h5", timestamp: "2026-05-31T14:10:00", text: "⚠️ Chamado #1042 - SLA vence em 2h - Empresa XYZ", recipients: ["Carlos (gerente)", "Felipe (técnico)"], status: "read", rule: "SLA em risco" },
  { id: "h6", timestamp: "2026-05-31T11:00:00", text: "⚠️ Chamado #1038 - SLA vence em 4h - Loja ABC", recipients: ["Carlos (gerente)"], status: "delivered", rule: "SLA em risco" },
  { id: "h7", timestamp: "2026-05-31T09:05:00", text: "\u{1F550} Você ainda não registrou entrada hoje. Registre pelo Portal.", recipients: ["Lucas (montador)"], status: "failed", rule: "Ponto não registrado" },
  { id: "h8", timestamp: "2026-05-30T17:30:00", text: "\u{1F4E6} Nova entrega agendada para 31/05 - Cliente: Fernanda Oliveira", recipients: ["Ricardo (motorista)"], status: "read", rule: "Nova entrega agendada" },
];

// Demo devices data
const demoDevices = [
  { id: "d1", user: "Carlos Mendes", role: "Gerente", type: "mobile", browser: "Chrome Android", os: "Android 14", lastActive: "2026-06-01T08:25:00", status: "online" },
  { id: "d2", user: "Carlos Mendes", role: "Gerente", type: "desktop", browser: "Chrome 126", os: "Windows 11", lastActive: "2026-06-01T08:30:00", status: "online" },
  { id: "d3", user: "João Silva", role: "Montador", type: "mobile", browser: "Safari iOS", os: "iOS 18", lastActive: "2026-06-01T07:50:00", status: "online" },
  { id: "d4", user: "Marcos Lima", role: "Vendedor", type: "desktop", browser: "Firefox 127", os: "macOS 15", lastActive: "2026-05-31T18:00:00", status: "offline" },
  { id: "d5", user: "Ana Souza", role: "Admin", type: "mobile", browser: "Chrome Android", os: "Android 15", lastActive: "2026-06-01T06:30:00", status: "online" },
  { id: "d6", user: "Felipe Costa", role: "Técnico", type: "mobile", browser: "Chrome Android", os: "Android 14", lastActive: "2026-05-31T16:45:00", status: "offline" },
  { id: "d7", user: "Ricardo Nunes", role: "Motorista", type: "mobile", browser: "Samsung Browser", os: "Android 13", lastActive: "2026-05-31T08:00:00", status: "offline" },
  { id: "d8", user: "Lucas Pereira", role: "Montador", type: "mobile", browser: "Chrome Android", os: "Android 14", lastActive: "2026-05-30T09:10:00", status: "offline" },
];

const triggerOptions = [
  { value: "entrega_criada", label: "Entrega criada" },
  { value: "montagem_concluida", label: "Montagem concluída" },
  { value: "lead_atribuido", label: "Lead atribuído" },
  { value: "contrato_aprovacao", label: "Contrato p/ aprovação" },
  { value: "sla_risco", label: "SLA em risco" },
  { value: "ponto_ausente", label: "Ponto ausente" },
  { value: "custom", label: "Personalizado" },
];

const recipientOptions = ["admin", "gerente", "vendedor", "tecnico", "montador", "logistica"];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatTimeAgo(iso: string) {
  const now = new Date();
  const d = new Date(iso);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d atrás`;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    read: "bg-green-500",
    delivered: "bg-yellow-500",
    sent: "bg-blue-400",
    failed: "bg-red-500",
    online: "bg-green-500",
    offline: "bg-gray-400",
  };
  const isActive = status === "online" || status === "read" || status === "delivered";
  return (
    <span className="relative flex h-2.5 w-2.5">
      {isActive && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[status] || "bg-gray-400"}`} />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status] || "bg-gray-400"}`} />
    </span>
  );
}

export default function PushNotificacoes() {
  const [activeTab, setActiveTab] = useState("regras");
  const [rules, setRules] = useState(demoRules);
  const [showNewRule, setShowNewRule] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [newRule, setNewRule] = useState({
    name: "",
    trigger: "",
    recipients: [] as string[],
    template: "",
    horaInicio: "08:00",
    horaFim: "18:00",
    active: true,
  });

  const stats = {
    sentToday: 24,
    devices: demoDevices.length,
    openRate: 78.5,
    activeRules: rules.filter((r) => r.active).length,
  };

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
    toast.success("Regra atualizada");
  };

  const toggleRecipient = (recipient: string) => {
    setNewRule((prev) => ({
      ...prev,
      recipients: prev.recipients.includes(recipient)
        ? prev.recipients.filter((r) => r !== recipient)
        : [...prev.recipients, recipient],
    }));
  };

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.trigger || newRule.recipients.length === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    toast.success("Regra criada com sucesso");
    setShowNewRule(false);
    setNewRule({ name: "", trigger: "", recipients: [], template: "", horaInicio: "08:00", horaFim: "18:00", active: true });
  };

  const filteredHistory = historyFilter === "all"
    ? demoHistory
    : demoHistory.filter((h) => h.rule === historyFilter);

  const mobileDevices = demoDevices.filter((d) => d.type === "mobile").length;
  const desktopDevices = demoDevices.filter((d) => d.type === "desktop").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-7 w-7 text-[#1E6FBF]" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
              {stats.sentToday}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0D1117]">Notificações Push</h1>
            <p className="text-sm text-[#6B7A90]">Gerencie alertas automáticos para a equipe e clientes</p>
          </div>
        </div>
        <Button onClick={() => setShowNewRule(true)} className="bg-[#1E6FBF] hover:bg-[#1a5fa6]">
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E8ECF2]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Send className="h-5 w-5 text-[#1E6FBF]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0D1117]">{stats.sentToday}</p>
              <p className="text-xs text-[#6B7A90]">Enviadas hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8ECF2]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Smartphone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0D1117]">{stats.devices}</p>
              <p className="text-xs text-[#6B7A90]">Dispositivos registrados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8ECF2]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0D1117]">{stats.openRate}%</p>
              <p className="text-xs text-[#6B7A90]">Taxa de abertura</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8ECF2]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <ToggleLeft className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0D1117]">{stats.activeRules}</p>
              <p className="text-xs text-[#6B7A90]">Regras ativas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="regras">Regras</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="dispositivos">Dispositivos</TabsTrigger>
        </TabsList>

        {/* Tab Regras */}
        <TabsContent value="regras" className="space-y-4 mt-4">
          {rules.map((rule) => {
            const Icon = rule.icon;
            return (
              <Card key={rule.id} className="border-[#E8ECF2] hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2.5 rounded-lg ${rule.active ? "bg-blue-50" : "bg-gray-50"}`}>
                        <Icon className={`h-5 w-5 ${rule.active ? "text-[#1E6FBF]" : "text-gray-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#0D1117]">{rule.name}</h3>
                          {rule.active && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#6B7A90] mb-2">{rule.description}</p>
                        <div className="bg-gray-50 rounded-md p-2 mb-3">
                          <code className="text-xs text-gray-700 break-all">{rule.template}</code>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {rule.recipients.map((r) => (
                            <Badge key={r} variant="secondary" className="text-xs capitalize">
                              {r}
                            </Badge>
                          ))}
                          <span className="text-xs text-[#6B7A90] ml-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(rule.lastFired)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={rule.active}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Tab Histórico */}
        <TabsContent value="historico" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 mb-2">
            <Filter className="h-4 w-4 text-[#6B7A90]" />
            <Select value={historyFilter} onValueChange={setHistoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por regra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as regras</SelectItem>
                {demoRules.map((r) => (
                  <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-[#E8ECF2]">
            <CardContent className="p-0">
              <div className="relative pl-8 py-4">
                {/* Vertical timeline line */}
                <div className="absolute left-[18px] top-6 bottom-6 w-px bg-[#E8ECF2]" />

                {filteredHistory.map((entry, idx) => (
                  <div key={entry.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div className="absolute left-[-14px] top-1.5 z-10 bg-white p-0.5">
                      <StatusDot status={entry.status} />
                    </div>

                    <div className="flex-1 min-w-0 ml-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[#6B7A90] font-mono">
                          {formatDateTime(entry.timestamp)}
                        </span>
                        <Badge variant={
                          entry.status === "read" ? "default" :
                          entry.status === "delivered" ? "secondary" :
                          entry.status === "failed" ? "destructive" : "outline"
                        } className="text-[10px] capitalize">
                          {entry.status === "read" ? "lido" :
                           entry.status === "delivered" ? "entregue" :
                           entry.status === "sent" ? "enviado" : "falhou"}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#0D1117] mb-1">{entry.text}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-[#6B7A90]">Para:</span>
                        {entry.recipients.map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                        ))}
                        <span className="text-xs text-[#6B7A90] ml-2">Regra: {entry.rule}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Dispositivos */}
        <TabsContent value="dispositivos" className="space-y-4 mt-4">
          <div className="flex items-center gap-4 mb-2">
            <Badge variant="outline" className="gap-1">
              <Smartphone className="h-3 w-3" />
              {mobileDevices} dispositivos móveis
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Laptop className="h-3 w-3" />
              {desktopDevices} desktops
            </Badge>
          </div>

          <div className="grid gap-3">
            {demoDevices.map((device) => (
              <Card key={device.id} className="border-[#E8ECF2]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        {device.type === "mobile" ? (
                          <Smartphone className="h-5 w-5 text-[#6B7A90]" />
                        ) : (
                          <Laptop className="h-5 w-5 text-[#6B7A90]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#0D1117]">{device.user}</span>
                          <Badge variant="secondary" className="text-[10px]">{device.role}</Badge>
                          <StatusDot status={device.status} />
                        </div>
                        <p className="text-xs text-[#6B7A90]">
                          {device.browser} · {device.os}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#6B7A90] hidden sm:inline">
                        Último acesso: {formatTimeAgo(device.lastActive)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.success(`Notificação de teste enviada para ${device.user}`)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Enviar teste
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Nova Regra Dialog */}
      <Dialog open={showNewRule} onOpenChange={setShowNewRule}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#0D1117]">Nova Regra de Notificação</DialogTitle>
            <DialogDescription className="text-[#6B7A90]">
              Configure quando e para quem enviar notificações push automáticas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nome da regra</Label>
              <Input
                placeholder="Ex: Alerta de vencimento"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Evento gatilho</Label>
              <Select value={newRule.trigger} onValueChange={(v) => setNewRule({ ...newRule, trigger: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {triggerOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destinatários</Label>
              <div className="flex flex-wrap gap-2">
                {recipientOptions.map((r) => (
                  <Badge
                    key={r}
                    variant={newRule.recipients.includes(r) ? "default" : "outline"}
                    className="cursor-pointer capitalize select-none"
                    onClick={() => toggleRecipient(r)}
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Template da mensagem</Label>
              <textarea
                className="w-full rounded-md border border-[#E8ECF2] p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-[#1E6FBF]/30"
                placeholder="Use {variáveis} e emojis. Ex: 📦 Nova entrega para {cliente}"
                value={newRule.template}
                onChange={(e) => setNewRule({ ...newRule, template: e.target.value })}
              />
              <p className="text-xs text-[#6B7A90]">Variáveis disponíveis: {"{cliente}"}, {"{data}"}, {"{valor}"}, {"{equipe}"}, {"{id}"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário ativo (de)</Label>
                <Input
                  type="time"
                  value={newRule.horaInicio}
                  onChange={(e) => setNewRule({ ...newRule, horaInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário ativo (até)</Label>
                <Input
                  type="time"
                  value={newRule.horaFim}
                  onChange={(e) => setNewRule({ ...newRule, horaFim: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newRule.active}
                  onCheckedChange={(checked) => setNewRule({ ...newRule, active: checked })}
                />
                <Label className="text-sm">Ativar imediatamente</Label>
              </div>
              <Button onClick={handleCreateRule} className="bg-[#1E6FBF] hover:bg-[#1a5fa6]">
                Criar Regra
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

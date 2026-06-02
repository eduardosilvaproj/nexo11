import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart,
  Bug,
  Lightbulb,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";

const MODULOS = [
  "comercial", "contratos", "tecnico", "producao", "logistica",
  "montagem", "pos-venda", "comissoes", "compras", "rh",
  "equipe", "analytics", "almoxarifado", "financeiro", "frota",
] as const;

const TIPOS = ["bug", "sugestao", "pedido", "melhoria"] as const;
const PRIORIDADES = ["baixa", "media", "alta", "critica"] as const;
const STATUS_OPTIONS = ["aberto", "em_analise", "planejado", "implementado", "recusado"] as const;

type FeedbackTipo = (typeof TIPOS)[number];
type FeedbackPrioridade = (typeof PRIORIDADES)[number];
type FeedbackStatus = (typeof STATUS_OPTIONS)[number];

interface FeedbackItem {
  id: string;
  tipo: FeedbackTipo;
  titulo: string;
  descricao: string;
  modulo: string;
  prioridade: FeedbackPrioridade;
  status: FeedbackStatus;
  votos: number;
  resposta_admin: string | null;
  criado_em: string;
  autor_id: string;
  autor_nome: string | null;
}

function tipoBadge(tipo: FeedbackTipo) {
  const map: Record<FeedbackTipo, { label: string; color: string; bg: string }> = {
    bug: { label: "Bug", color: "#F04438", bg: "#FEF3F2" },
    sugestao: { label: "Sugestão", color: "#1E6FBF", bg: "#EFF8FF" },
    pedido: { label: "Pedido", color: "#7C3AED", bg: "#F5F3FF" },
    melhoria: { label: "Melhoria", color: "#12B76A", bg: "#ECFDF5" },
  };
  const t = map[tipo];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: t.color, backgroundColor: t.bg }}
    >
      {t.label}
    </span>
  );
}

function statusBadge(status: FeedbackStatus) {
  const map: Record<FeedbackStatus, { label: string; color: string; bg: string }> = {
    aberto: { label: "Aberto", color: "#6B7A90", bg: "#F3F4F6" },
    em_analise: { label: "Em Análise", color: "#D97706", bg: "#FFFBEB" },
    planejado: { label: "Planejado", color: "#1E6FBF", bg: "#EFF8FF" },
    implementado: { label: "Implementado", color: "#12B76A", bg: "#ECFDF5" },
    recusado: { label: "Recusado", color: "#F04438", bg: "#FEF3F2" },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {s.label}
    </span>
  );
}

function prioridadeLabel(p: FeedbackPrioridade) {
  const map: Record<FeedbackPrioridade, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica",
  };
  return map[p];
}

export default function Feedback() {
  const { user, perfil } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("all");
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>("all");
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  // Form state
  const [formTipo, setFormTipo] = useState<FeedbackTipo>("sugestao");
  const [formTitulo, setFormTitulo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formModulo, setFormModulo] = useState("");
  const [formPrioridade, setFormPrioridade] = useState<FeedbackPrioridade>("media");

  // Admin inline edit
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingResposta, setEditingResposta] = useState<string | null>(null);
  const [respostaText, setRespostaText] = useState("");

  const isAdmin = perfil?.id === user?.id; // simplified admin check

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["feedbacks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feedbacks")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data || []) as FeedbackItem[];
    },
  });

  // Load user votes
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("feedback_votos")
        .select("feedback_id")
        .eq("user_id", user.id);
      if (data) {
        setVotedIds(new Set(data.map((v: any) => v.feedback_id)));
      }
    })();
  }, [user]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("feedbacks").insert({
        tipo: formTipo,
        titulo: formTitulo,
        descricao: formDescricao,
        modulo: formModulo,
        prioridade: formPrioridade,
        status: "aberto",
        votos: 0,
        autor_id: user?.id,
        autor_nome: perfil?.nome || "Usuário",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      setDialogOpen(false);
      setFormTitulo("");
      setFormDescricao("");
      setFormModulo("");
    },
    onError: () => toast.error("Erro ao enviar feedback"),
  });

  const voteMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const hasVoted = votedIds.has(feedbackId);
      if (hasVoted) {
        await (supabase as any)
          .from("feedback_votos")
          .delete()
          .eq("feedback_id", feedbackId)
          .eq("user_id", user?.id);
        await (supabase as any)
          .from("feedbacks")
          .update({ votos: (feedbacks.find((f) => f.id === feedbackId)?.votos || 1) - 1 })
          .eq("id", feedbackId);
      } else {
        await (supabase as any)
          .from("feedback_votos")
          .insert({ feedback_id: feedbackId, user_id: user?.id });
        await (supabase as any)
          .from("feedbacks")
          .update({ votos: (feedbacks.find((f) => f.id === feedbackId)?.votos || 0) + 1 })
          .eq("id", feedbackId);
      }
      return { feedbackId, hasVoted };
    },
    onSuccess: ({ feedbackId, hasVoted }) => {
      setVotedIds((prev) => {
        const next = new Set(prev);
        if (hasVoted) next.delete(feedbackId);
        else next.add(feedbackId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("feedbacks")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      setEditingStatus(null);
      toast.success("Status atualizado");
    },
  });

  const updateRespostaMutation = useMutation({
    mutationFn: async ({ id, resposta }: { id: string; resposta: string }) => {
      const { error } = await (supabase as any)
        .from("feedbacks")
        .update({ resposta_admin: resposta })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      setEditingResposta(null);
      setRespostaText("");
      toast.success("Resposta salva");
    },
  });

  const filtered = feedbacks.filter((f) => {
    if (filtroTipo !== "all" && f.tipo !== filtroTipo) return false;
    if (filtroStatus !== "all" && f.status !== filtroStatus) return false;
    if (filtroPrioridade !== "all" && f.prioridade !== filtroPrioridade) return false;
    return true;
  });

  const stats = {
    total: feedbacks.length,
    bugs: feedbacks.filter((f) => f.tipo === "bug").length,
    sugestoes: feedbacks.filter((f) => f.tipo === "sugestao").length,
    emAnalise: feedbacks.filter((f) => f.status === "em_analise").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D1117" }}>
            Central de Feedback
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7A90" }}>
            Envie sugestões, reporte bugs e vote nas melhorias mais importantes
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          style={{ backgroundColor: "#1E6FBF" }}
          className="text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Feedback
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs" style={{ color: "#6B7A90" }}>Total</p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#0D1117" }}>{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center gap-2">
            <Bug className="w-4 h-4" style={{ color: "#F04438" }} />
            <div>
              <p className="text-xs" style={{ color: "#6B7A90" }}>Bugs</p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#F04438" }}>{stats.bugs}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" style={{ color: "#1E6FBF" }} />
            <div>
              <p className="text-xs" style={{ color: "#6B7A90" }}>Sugestões</p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#1E6FBF" }}>{stats.sugestoes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: "#D97706" }} />
            <div>
              <p className="text-xs" style={{ color: "#6B7A90" }}>Em Análise</p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#D97706" }}>{stats.emAnalise}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>{t === "sugestao" ? "Sugestão" : t === "pedido" ? "Pedido" : t === "melhoria" ? "Melhoria" : "Bug"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s === "em_analise" ? "Em Análise" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            {PRIORIDADES.map((p) => (
              <SelectItem key={p} value={p}>{prioridadeLabel(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {isLoading && <p className="text-sm" style={{ color: "#6B7A90" }}>Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <p style={{ color: "#6B7A90" }}>Nenhum feedback encontrado</p>
            </CardContent>
          </Card>
        )}
        {filtered.map((fb) => {
          const isExpanded = expandedId === fb.id;
          return (
            <Card key={fb.id} className="rounded-2xl hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {tipoBadge(fb.tipo)}
                      <h3 className="font-medium text-sm" style={{ color: "#0D1117" }}>{fb.titulo}</h3>
                      {statusBadge(fb.status)}
                    </div>
                    {!isExpanded && (
                      <p className="text-xs mt-1 truncate" style={{ color: "#6B7A90" }}>
                        {fb.descricao}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "#6B7A90" }}>
                      <span>{fb.modulo}</span>
                      <span>{prioridadeLabel(fb.prioridade)}</span>
                      <span>{new Date(fb.criado_em).toLocaleDateString("pt-BR")}</span>
                      <span>{fb.autor_nome || "Anônimo"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        voteMutation.mutate(fb.id);
                      }}
                    >
                      <Heart
                        className="w-4 h-4"
                        fill={votedIds.has(fb.id) ? "#F04438" : "none"}
                        stroke={votedIds.has(fb.id) ? "#F04438" : "#6B7A90"}
                      />
                      <span className="text-xs">{fb.votos}</span>
                    </Button>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-3 space-y-3" style={{ borderTop: "1px solid #E8ECF2" }}>
                    <p className="text-sm" style={{ color: "#0D1117" }}>{fb.descricao}</p>

                    {fb.resposta_admin && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: "#F0F9FF" }}>
                        <p className="text-xs font-medium mb-1" style={{ color: "#1E6FBF" }}>Resposta da equipe:</p>
                        <p className="text-sm" style={{ color: "#0D1117" }}>{fb.resposta_admin}</p>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {editingStatus === fb.id ? (
                          <Select
                            value={fb.status}
                            onValueChange={(val) => updateStatusMutation.mutate({ id: fb.id, status: val })}
                          >
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>{s === "em_analise" ? "Em Análise" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setEditingStatus(fb.id)}>
                            Alterar Status
                          </Button>
                        )}

                        {editingResposta === fb.id ? (
                          <div className="w-full flex gap-2">
                            <Input
                              value={respostaText}
                              onChange={(e) => setRespostaText(e.target.value)}
                              placeholder="Escreva a resposta..."
                              className="flex-1 h-8 text-xs"
                            />
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              style={{ backgroundColor: "#1E6FBF" }}
                              onClick={() => updateRespostaMutation.mutate({ id: fb.id, resposta: respostaText })}
                            >
                              Salvar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              setEditingResposta(fb.id);
                              setRespostaText(fb.resposta_admin || "");
                            }}
                          >
                            {fb.resposta_admin ? "Editar Resposta" : "Responder"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New Feedback Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle style={{ color: "#0D1117" }}>Novo Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#6B7A90" }}>Tipo</label>
              <Select value={formTipo} onValueChange={(v) => setFormTipo(v as FeedbackTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="sugestao">Sugestão</SelectItem>
                  <SelectItem value="pedido">Pedido</SelectItem>
                  <SelectItem value="melhoria">Melhoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#6B7A90" }}>Título</label>
              <Input value={formTitulo} onChange={(e) => setFormTitulo(e.target.value)} placeholder="Resumo curto do feedback" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#6B7A90" }}>Descrição</label>
              <Textarea value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} placeholder="Descreva em detalhes..." rows={4} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#6B7A90" }}>Módulo</label>
              <Select value={formModulo} onValueChange={setFormModulo}>
                <SelectTrigger><SelectValue placeholder="Selecione o módulo" /></SelectTrigger>
                <SelectContent>
                  {MODULOS.map((m) => (
                    <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace("-", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#6B7A90" }}>Prioridade</label>
              <Select value={formPrioridade} onValueChange={(v) => setFormPrioridade(v as FeedbackPrioridade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              style={{ backgroundColor: "#1E6FBF" }}
              className="text-white"
              onClick={() => createMutation.mutate()}
              disabled={!formTitulo || !formDescricao || !formModulo}
            >
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

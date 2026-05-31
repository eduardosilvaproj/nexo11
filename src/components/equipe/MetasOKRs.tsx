import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";
import { toast } from "sonner";
import {
  Target,
  Plus,
  Calendar,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

type Meta = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: "individual" | "equipe";
  pessoa_id: string | null;
  meta_valor: number;
  valor_atual: number;
  prazo: string | null;
  status: "em_andamento" | "concluida" | "cancelada";
  created_at: string;
};

type Pessoa = { id: string; nome: string };

type FilterType = "all" | "individual" | "equipe" | "concluidas";

function daysRemaining(prazo: string | null): number | null {
  if (!prazo) return null;
  const diff = new Date(prazo).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getProgressColor(meta: Meta): string {
  if (meta.status === "concluida") return "#12B76A";
  if (meta.status === "cancelada") return "#6B7A90";
  const days = daysRemaining(meta.prazo);
  if (days !== null && days < 0) return "#EF4444";
  const pct = meta.meta_valor > 0 ? (meta.valor_atual / meta.meta_valor) * 100 : 0;
  if (days !== null && days <= 7 && pct < 70) return "#F59E0B";
  return "#12B76A";
}

export function MetasOKRs() {
  const { roles, perfil } = useAuth();
  const lojaId = perfil?.loja_id ?? null;
  const queryClient = useQueryClient();
  const canManage = canPerform(roles, "equipe.manage");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    tipo: "individual" as "individual" | "equipe",
    pessoa_id: "",
    meta_valor: "",
    valor_atual: "0",
    prazo: "",
  });

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ["equipe_metas", lojaId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("equipe_metas")
        .select("*")
        .eq("loja_id", lojaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Meta[];
    },
    enabled: !!lojaId,
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ["pessoas_ativas", lojaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pessoas")
        .select("id, nome")
        .eq("loja_id", lojaId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Pessoa[];
    },
    enabled: !!lojaId,
  });

  const createMeta = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("equipe_metas").insert({
        loja_id: lojaId,
        titulo: form.titulo,
        descricao: form.descricao || null,
        tipo: form.tipo,
        pessoa_id: form.tipo === "individual" && form.pessoa_id ? form.pessoa_id : null,
        meta_valor: parseFloat(form.meta_valor) || 0,
        valor_atual: parseFloat(form.valor_atual) || 0,
        prazo: form.prazo || null,
        status: "em_andamento",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["equipe_metas"] });
      setOpen(false);
      setForm({ titulo: "", descricao: "", tipo: "individual", pessoa_id: "", meta_valor: "", valor_atual: "0", prazo: "" });
    },
    onError: () => toast.error("Erro ao criar meta"),
  });

  const filtered = metas.filter((m) => {
    if (filter === "individual") return m.tipo === "individual" && m.status === "em_andamento";
    if (filter === "equipe") return m.tipo === "equipe" && m.status === "em_andamento";
    if (filter === "concluidas") return m.status === "concluida";
    return true;
  });

  const getPessoaNome = (id: string | null) => {
    if (!id) return "Equipe";
    return pessoas.find((p) => p.id === id)?.nome ?? "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 style={{ color: "#0D1117", fontSize: 16, fontWeight: 600 }}>Metas e OKRs</h3>
        {canManage && (
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus size={14} /> Nova Meta
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "individual", "equipe", "concluidas"] as FilterType[]).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            style={{ fontSize: 11 }}
          >
            {f === "all" ? "Todas" : f === "individual" ? "Individual" : f === "equipe" ? "Equipe" : "Concluídas"}
          </Button>
        ))}
      </div>

      {/* Cards */}
      {isLoading ? (
        <p style={{ color: "#6B7A90", fontSize: 13 }}>Carregando...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#6B7A90", fontSize: 13 }}>Nenhuma meta encontrada.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((meta) => {
            const pct = meta.meta_valor > 0 ? Math.min((meta.valor_atual / meta.meta_valor) * 100, 100) : 0;
            const days = daysRemaining(meta.prazo);
            const color = getProgressColor(meta);
            return (
              <div
                key={meta.id}
                className="rounded-lg p-4 space-y-3"
                style={{ border: "1px solid #E8ECF2", background: "#fff" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>{meta.titulo}</h4>
                  {meta.status === "concluida" && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
                  {meta.status === "cancelada" && <XCircle size={16} className="text-gray-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: 11, color: "#6B7A90" }}>
                  {meta.tipo === "individual" ? <User size={12} /> : <Users size={12} />}
                  <span>{getPessoaNome(meta.pessoa_id)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between" style={{ fontSize: 11, color: "#6B7A90" }}>
                    <span>{pct.toFixed(0)}%</span>
                    <span>{meta.valor_atual}/{meta.meta_valor}</span>
                  </div>
                  <Progress value={pct} className="h-2" style={{ "--progress-color": color } as any} />
                </div>
                {days !== null && (
                  <div className="flex items-center gap-1" style={{ fontSize: 11, color }}>
                    <Clock size={12} />
                    <span>
                      {days < 0
                        ? `Vencida há ${Math.abs(days)} dias`
                        : days === 0
                        ? "Vence hoje"
                        : `${days} dias restantes`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Nova Meta */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target size={18} /> Nova Meta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label style={{ fontSize: 11 }}>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <Label style={{ fontSize: 11 }}>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label style={{ fontSize: 11 }}>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="equipe">Equipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.tipo === "individual" && (
                <div>
                  <Label style={{ fontSize: 11 }}>Pessoa</Label>
                  <Select value={form.pessoa_id} onValueChange={(v) => setForm({ ...form, pessoa_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {pessoas.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label style={{ fontSize: 11 }}>Meta (valor)</Label>
                <Input type="number" value={form.meta_valor} onChange={(e) => setForm({ ...form, meta_valor: e.target.value })} />
              </div>
              <div>
                <Label style={{ fontSize: 11 }}>Valor atual</Label>
                <Input type="number" value={form.valor_atual} onChange={(e) => setForm({ ...form, valor_atual: e.target.value })} />
              </div>
            </div>
            <div>
              <Label style={{ fontSize: 11 }}>Prazo</Label>
              <Input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMeta.mutate()} disabled={!form.titulo || createMeta.isPending}>
              {createMeta.isPending ? "Salvando..." : "Criar Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

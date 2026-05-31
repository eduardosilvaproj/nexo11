import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Pin,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";

type Aviso = {
  id: string;
  titulo: string;
  conteudo: string;
  prioridade: "normal" | "importante" | "urgente";
  fixado: boolean;
  lido_por: string[];
  created_by: string | null;
  created_at: string;
};

const PRIORIDADE_CONFIG = {
  normal: { color: "#3B82F6", bg: "#EFF6FF", label: "Normal", icon: Info },
  importante: { color: "#F59E0B", bg: "#FFFBEB", label: "Importante", icon: AlertTriangle },
  urgente: { color: "#EF4444", bg: "#FEF2F2", label: "Urgente", icon: AlertCircle },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MuralAvisos() {
  const { roles, perfil, user } = useAuth();
  const lojaId = perfil?.loja_id ?? null;
  const queryClient = useQueryClient();
  const canManage = canPerform(roles, "equipe.manage");
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    titulo: "",
    conteudo: "",
    prioridade: "normal" as "normal" | "importante" | "urgente",
    fixado: false,
  });

  const { data: avisos = [], isLoading } = useQuery({
    queryKey: ["equipe_avisos", lojaId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("equipe_avisos")
        .select("*")
        .eq("loja_id", lojaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Aviso[];
    },
    enabled: !!lojaId,
  });

  const createAviso = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("equipe_avisos").insert({
        loja_id: lojaId,
        titulo: form.titulo,
        conteudo: form.conteudo,
        prioridade: form.prioridade,
        fixado: form.fixado,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso publicado");
      queryClient.invalidateQueries({ queryKey: ["equipe_avisos"] });
      setOpen(false);
      setForm({ titulo: "", conteudo: "", prioridade: "normal", fixado: false });
    },
    onError: () => toast.error("Erro ao publicar aviso"),
  });

  const marcarLido = useMutation({
    mutationFn: async (avisoId: string) => {
      const aviso = avisos.find((a) => a.id === avisoId);
      if (!aviso || !user?.id) return;
      const novoLidoPor = [...(aviso.lido_por || []), user.id];
      const { error } = await (supabase as any)
        .from("equipe_avisos")
        .update({ lido_por: novoLidoPor })
        .eq("id", avisoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipe_avisos"] });
    },
  });

  const unreadCount = avisos.filter(
    (a) => user?.id && !(a.lido_por || []).includes(user.id)
  ).length;

  // Sort: pinned first, then by date
  const sorted = [...avisos].sort((a, b) => {
    if (a.fixado && !b.fixado) return -1;
    if (!a.fixado && b.fixado) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 style={{ color: "#0D1117", fontSize: 16, fontWeight: 600 }}>Mural de Avisos</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
              {unreadCount} {unreadCount === 1 ? "novo" : "novos"}
            </Badge>
          )}
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus size={14} /> Novo Aviso
          </Button>
        )}
      </div>

      {isLoading ? (
        <p style={{ color: "#6B7A90", fontSize: 13 }}>Carregando...</p>
      ) : sorted.length === 0 ? (
        <p style={{ color: "#6B7A90", fontSize: 13 }}>Nenhum aviso publicado.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((aviso) => {
            const config = PRIORIDADE_CONFIG[aviso.prioridade];
            const PrioIcon = config.icon;
            const isRead = user?.id ? (aviso.lido_por || []).includes(user.id) : true;
            return (
              <div
                key={aviso.id}
                className="rounded-lg p-4 space-y-2"
                style={{
                  border: `1px solid ${isRead ? "#E8ECF2" : config.color}`,
                  background: isRead ? "#fff" : config.bg,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {aviso.fixado && <Pin size={13} style={{ color: "#6B7A90" }} />}
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>
                      {aviso.titulo}
                    </h4>
                  </div>
                  <Badge
                    style={{ background: config.bg, color: config.color, fontSize: 10, border: `1px solid ${config.color}30` }}
                  >
                    <PrioIcon size={10} className="mr-1" />
                    {config.label}
                  </Badge>
                </div>
                <p style={{ fontSize: 13, color: "#0D1117", whiteSpace: "pre-wrap" }}>
                  {aviso.conteudo}
                </p>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 11, color: "#6B7A90" }}>
                    {formatDate(aviso.created_at)}
                  </span>
                  {!isRead && user?.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 h-7 text-xs"
                      onClick={() => marcarLido.mutate(aviso.id)}
                    >
                      <CheckCheck size={12} /> Marcar como lido
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Novo Aviso */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone size={18} /> Novo Aviso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label style={{ fontSize: 11 }}>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <Label style={{ fontSize: 11 }}>Conteúdo</Label>
              <Textarea value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} rows={4} />
            </div>
            <div>
              <Label style={{ fontSize: 11 }}>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="importante">Importante</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.fixado} onCheckedChange={(v) => setForm({ ...form, fixado: v })} />
              <Label style={{ fontSize: 11 }}>Fixar no topo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createAviso.mutate()} disabled={!form.titulo || !form.conteudo || createAviso.isPending}>
              {createAviso.isPending ? "Publicando..." : "Publicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

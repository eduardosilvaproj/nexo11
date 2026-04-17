import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Equipe = {
  id: string;
  nome: string;
  cor: string;
  capacidade_horas_dia: number;
  ativo: boolean;
};

export default function Equipes() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Equipe | null>(null);
  const [open, setOpen] = useState(false);

  const { data: equipes = [], isLoading } = useQuery({
    queryKey: ["equipes-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as Equipe[];
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-loja"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("id, nome, email").order("nome");
      return data ?? [];
    },
  });

  const { data: membros = [] } = useQuery({
    queryKey: ["equipe-membros"],
    queryFn: async () => {
      const { data } = await supabase.from("equipe_membros").select("id, equipe_id, user_id");
      return data ?? [];
    },
  });

  const userMap = new Map(usuarios.map((u) => [u.id, u]));

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipe removida");
      qc.invalidateQueries({ queryKey: ["equipes-admin"] });
      qc.invalidateQueries({ queryKey: ["equipes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMembro = useMutation({
    mutationFn: async ({ equipe_id, user_id }: { equipe_id: string; user_id: string }) => {
      const { error } = await supabase.from("equipe_membros").insert({ equipe_id, user_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro adicionado");
      qc.invalidateQueries({ queryKey: ["equipe-membros"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMembro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipe_membros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipe-membros"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#0D1117" }}>NEXO Equipes</h1>
          <p style={{ fontSize: 13, color: "#6B7A90", marginTop: 4 }}>
            Cadastro de equipes de montagem e seus membros
          </p>
        </div>
        <EquipeFormDialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
          editing={editing}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["equipes-admin"] });
            qc.invalidateQueries({ queryKey: ["equipes"] });
            setOpen(false);
            setEditing(null);
          }}
        />
      </div>

      {isLoading ? (
        <div style={{ fontSize: 13, color: "#6B7A90" }}>Carregando…</div>
      ) : equipes.length === 0 ? (
        <div
          className="rounded-xl bg-white py-12 text-center"
          style={{ border: "0.5px solid #E8ECF2" }}
        >
          <span style={{ fontSize: 13, color: "#6B7A90" }}>Nenhuma equipe cadastrada.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {equipes.map((eq) => {
            const eqMembros = membros.filter((m) => m.equipe_id === eq.id);
            const disponiveis = usuarios.filter(
              (u) => !eqMembros.some((m) => m.user_id === u.id),
            );
            return (
              <div
                key={eq.id}
                className="rounded-xl bg-white p-5"
                style={{ border: "0.5px solid #E8ECF2" }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: eq.cor }}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{eq.nome}</div>
                      <div style={{ fontSize: 11, color: "#6B7A90" }}>
                        {Number(eq.capacidade_horas_dia)}h/dia ·{" "}
                        {eq.ativo ? "Ativa" : "Inativa"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(eq);
                        setOpen(true);
                      }}
                      className="rounded p-1.5 hover:bg-muted"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="rounded p-1.5 hover:bg-muted" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" style={{ color: "#E53935" }} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Os membros serão removidos. Agendamentos existentes ficarão sem equipe.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => delMut.mutate(eq.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <span style={{ fontSize: 12, color: "#6B7A90" }}>
                    Membros ({eqMembros.length})
                  </span>
                  <AddMembroPopover
                    disponiveis={disponiveis}
                    onAdd={(user_id) => addMembro.mutate({ equipe_id: eq.id, user_id })}
                  />
                </div>

                {eqMembros.length === 0 ? (
                  <div
                    className="rounded py-3 text-center"
                    style={{ border: "1px dashed #E8ECF2", fontSize: 12, color: "#B0BAC9" }}
                  >
                    Nenhum membro
                  </div>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {eqMembros.map((m) => {
                      const u = userMap.get(m.user_id);
                      return (
                        <li
                          key={m.id}
                          className="flex items-center justify-between rounded px-3 py-2"
                          style={{ backgroundColor: "#F5F7FA", fontSize: 13 }}
                        >
                          <div>
                            <div style={{ fontWeight: 500 }}>{u?.nome ?? "—"}</div>
                            <div style={{ fontSize: 11, color: "#6B7A90" }}>{u?.email ?? ""}</div>
                          </div>
                          <button
                            onClick={() => delMembro.mutate(m.id)}
                            className="rounded p-1 hover:bg-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =================== FORM ===================

function EquipeFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Equipe | null;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(editing?.nome ?? "");
  const [cor, setCor] = useState(editing?.cor ?? "#1E6FBF");
  const [cap, setCap] = useState(String(editing?.capacidade_horas_dia ?? "8"));
  const [ativo, setAtivo] = useState<string>(editing?.ativo === false ? "0" : "1");

  // sync when editing changes
  useState(() => {
    setNome(editing?.nome ?? "");
    setCor(editing?.cor ?? "#1E6FBF");
    setCap(String(editing?.capacidade_horas_dia ?? "8"));
    setAtivo(editing?.ativo === false ? "0" : "1");
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome");
      if (editing) {
        const { error } = await supabase
          .from("equipes")
          .update({
            nome,
            cor,
            capacidade_horas_dia: Number(cap) || 8,
            ativo: ativo === "1",
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { data: usr } = await supabase
          .from("usuarios")
          .select("loja_id")
          .eq("id", u.user?.id ?? "")
          .maybeSingle();
        if (!usr?.loja_id) throw new Error("Usuário sem loja");
        const { error } = await supabase.from("equipes").insert({
          loja_id: usr.loja_id,
          nome,
          cor,
          capacidade_horas_dia: Number(cap) || 8,
          ativo: ativo === "1",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Equipe atualizada" : "Equipe criada");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setNome(editing?.nome ?? "");
          setCor(editing?.cor ?? "#1E6FBF");
          setCap(String(editing?.capacidade_horas_dia ?? "8"));
          setAtivo(editing?.ativo === false ? "0" : "1");
        }
        onOpenChange(v);
      }}
    >
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-white"
          style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
        >
          <Plus className="h-4 w-4" /> Nova equipe
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar equipe" : "Nova equipe"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Equipe A" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Cor</Label>
              <Input type="color" value={cor} onChange={(e) => setCor(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Capacidade (h/dia)</Label>
              <Input type="number" value={cap} onChange={(e) => setCap(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Status</Label>
            <Select value={ativo} onValueChange={setAtivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Ativa</SelectItem>
                <SelectItem value="0">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            style={{ backgroundColor: "#1E6FBF" }}
          >
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMembroPopover({
  disponiveis,
  onAdd,
}: {
  disponiveis: Array<{ id: string; nome: string }>;
  onAdd: (user_id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1 rounded px-2 py-1"
          style={{ fontSize: 11, color: "#1E6FBF", border: "1px solid #E8ECF2" }}
        >
          <UserPlus className="h-3 w-3" /> Adicionar
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar membro</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          <Label>Usuário</Label>
          <Select value={sel} onValueChange={setSel}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {disponiveis.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Todos os usuários já estão na equipe
                </div>
              ) : (
                disponiveis.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (sel) {
                onAdd(sel);
                setSel("");
                setOpen(false);
              }
            }}
            disabled={!sel}
            style={{ backgroundColor: "#1E6FBF" }}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

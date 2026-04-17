import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, CalendarIcon, Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkAgendamentoConflict } from "@/lib/agendamento-conflict";

interface MontagemTabProps {
  contratoId: string;
}

const STATUS_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  agendado: { bg: "#E6F3FF", fg: "#1E6FBF", label: "Agendado" },
  em_execucao: { bg: "#FAECE7", fg: "#993C1D", label: "Em andamento" },
  concluido: { bg: "#D1FAE5", fg: "#05873C", label: "Concluído" },
  cancelado: { bg: "#FEE2E2", fg: "#E53935", label: "Reagendado" },
};

const Card = ({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", padding: 20 }}>
    <div className="mb-4 flex items-center justify-between">
      <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-1.5">
    <span style={{ fontSize: 12, color: "#6B7A90" }}>{label}</span>
    <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>{value || "—"}</span>
  </div>
);

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export function ContratoMontagemTab({ contratoId }: MontagemTabProps) {
  const qc = useQueryClient();

  // ============ AGENDAMENTO ============
  const { data: agendamento } = useQuery({
    queryKey: ["agendamento", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos_montagem")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-min"],
    queryFn: async () => (await supabase.from("usuarios").select("id, nome")).data ?? [],
  });

  const { data: equipes = [] } = useQuery({
    queryKey: ["equipes"],
    queryFn: async () =>
      (await supabase.from("equipes").select("id, nome, cor").eq("ativo", true).order("nome")).data ?? [],
  });

  const [agOpen, setAgOpen] = useState(false);
  const [agData, setAgData] = useState<Date | undefined>();
  const [agInicio, setAgInicio] = useState("08:00");
  const [agFim, setAgFim] = useState("17:00");
  const [agEquipe, setAgEquipe] = useState<string>("");

  const agendarMut = useMutation({
    mutationFn: async () => {
      if (!agData) throw new Error("Selecione a data");
      const dataStr = format(agData, "yyyy-MM-dd");
      const equipeSel = equipes.find((e) => e.id === agEquipe) as any;
      const check = await checkAgendamentoConflict({
        equipeId: agEquipe || null,
        data: dataStr,
        horaInicio: agInicio || null,
        horaFim: agFim || null,
        capacidadeHorasDia: equipeSel?.capacidade_horas_dia,
        excludeId: agendamento?.id,
      });
      if (check.error) throw new Error(check.error);
      if (check.conflito)
        throw new Error(
          `Conflito: equipe já agendada das ${check.conflito.hora_inicio?.slice(0, 5)} às ${check.conflito.hora_fim?.slice(0, 5)}`,
        );
      if (check.excedeCapacidade)
        throw new Error(
          `Excede capacidade diária (${check.capacidade}h). Já reservadas: ${check.horasReservadas.toFixed(1)}h`,
        );
      if (agendamento?.id) {
        const { error } = await supabase
          .from("agendamentos_montagem")
          .update({
            data: dataStr,
            hora_inicio: agInicio || null,
            hora_fim: agFim || null,
            equipe_id: agEquipe || null,
          })
          .eq("id", agendamento.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agendamentos_montagem").insert({
          contrato_id: contratoId,
          data: dataStr,
          hora_inicio: agInicio || null,
          hora_fim: agFim || null,
          equipe_id: agEquipe || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(agendamento?.id ? "Montagem reagendada" : "Montagem agendada");
      setAgOpen(false);
      qc.invalidateQueries({ queryKey: ["agendamento", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checklist = Array.isArray(agendamento?.checklist_obra_json)
    ? (agendamento!.checklist_obra_json as Array<{ item: string; concluido?: boolean; foto?: string }>)
    : [];

  const checklistMut = useMutation({
    mutationFn: async (next: typeof checklist) => {
      if (!agendamento) return;
      const { error } = await supabase
        .from("agendamentos_montagem")
        .update({ checklist_obra_json: next })
        .eq("id", agendamento.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agendamento", contratoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const checkConcluidos = checklist.filter((i) => i.concluido).length;
  const checkPct = checklist.length > 0 ? Math.round((checkConcluidos / checklist.length) * 100) : 0;

  // ============ RETRABALHOS ============
  const { data: retrabalhos = [] } = useQuery({
    queryKey: ["retrabalhos", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retrabalhos")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const userMap = new Map(usuarios.map((u) => [u.id, u.nome]));
  const pendentes = retrabalhos.filter((r) => !r.resolvido).length;

  const [retOpen, setRetOpen] = useState(false);
  const [retForm, setRetForm] = useState({ motivo: "", responsavel: "", custo: "" });

  const addRetrabalho = useMutation({
    mutationFn: async () => {
      if (!retForm.motivo) throw new Error("Informe o motivo");
      const { error } = await supabase.from("retrabalhos").insert({
        contrato_id: contratoId,
        motivo: retForm.motivo,
        responsavel: retForm.responsavel || null,
        custo: Number(retForm.custo) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Retrabalho registrado");
      setRetOpen(false);
      setRetForm({ motivo: "", responsavel: "", custo: "" });
      qc.invalidateQueries({ queryKey: ["retrabalhos", contratoId] });
      qc.invalidateQueries({ queryKey: ["dre", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRetrabalho = useMutation({
    mutationFn: async (r: { id: string; resolvido: boolean }) => {
      const { error } = await supabase
        .from("retrabalhos")
        .update({
          resolvido: !r.resolvido,
          data_resolucao: !r.resolvido ? new Date().toISOString() : null,
        })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["retrabalhos", contratoId] });
      qc.invalidateQueries({ queryKey: ["dre", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* AGENDAMENTO */}
      <Card
        title="Agendamento"
        right={
          agendamento ? (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5"
              style={{
                ...STATUS_BADGE[agendamento.status],
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: STATUS_BADGE[agendamento.status]?.bg,
                color: STATUS_BADGE[agendamento.status]?.fg,
              }}
            >
              {STATUS_BADGE[agendamento.status]?.label}
            </span>
          ) : null
        }
      >
        {!agendamento ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <span style={{ fontSize: 13, color: "#6B7A90" }}>Nenhuma montagem agendada.</span>
            <Dialog open={agOpen} onOpenChange={setAgOpen}>
              <DialogTrigger asChild>
                <button
                  className="rounded-lg px-4 py-2 text-white"
                  style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
                >
                  Agendar montagem
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agendar montagem</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Label>Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !agData && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {agData ? format(agData, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={agData}
                          onSelect={setAgData}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <Label>Hora início</Label>
                      <Input type="time" value={agInicio} onChange={(e) => setAgInicio(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Hora fim</Label>
                      <Input type="time" value={agFim} onChange={(e) => setAgFim(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Equipe</Label>
                    <Select value={agEquipe} onValueChange={setAgEquipe}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipes.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAgOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => agendarMut.mutate()}
                    disabled={agendarMut.isPending}
                    style={{ backgroundColor: "#1E6FBF" }}
                  >
                    {agendarMut.isPending ? "Salvando..." : "Agendar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div>
            <Field
              label="Equipe"
              value={agendamento.equipe_id ? equipes.find((e) => e.id === agendamento.equipe_id)?.nome ?? "—" : "—"}
            />
            <Field label="Data" value={new Date(agendamento.data).toLocaleDateString("pt-BR")} />
            <Field
              label="Horário"
              value={`${agendamento.hora_inicio?.slice(0, 5) ?? "--"} – ${agendamento.hora_fim?.slice(0, 5) ?? "--"}`}
            />
          </div>
        )}
      </Card>

      {/* CHECKLIST DE OBRA */}
      {agendamento && (
        <Card
          title="Checklist de obra"
          right={
            <span style={{ fontSize: 12, color: "#6B7A90" }}>
              {checkConcluidos} de {checklist.length} ({checkPct}%)
            </span>
          }
        >
          <div
            className="mb-3 h-2 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "#E8ECF2" }}
          >
            <div
              className="h-full transition-all"
              style={{ width: `${checkPct}%`, backgroundColor: "#1E6FBF" }}
            />
          </div>
          {checklist.length === 0 && (
            <span style={{ fontSize: 13, color: "#6B7A90" }}>
              Nenhum item de checklist de obra cadastrado.
            </span>
          )}
          <ul>
            {checklist.map((it, i) => (
              <li
                key={i}
                className="flex items-center gap-3 py-2"
                style={{ borderTop: i === 0 ? "none" : "0.5px solid #E8ECF2" }}
              >
                <button
                  onClick={() => {
                    const next = checklist.map((c, idx) =>
                      idx === i ? { ...c, concluido: !c.concluido } : c,
                    );
                    checklistMut.mutate(next);
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  style={{
                    backgroundColor: it.concluido ? "#12B76A" : "transparent",
                    border: it.concluido ? "1px solid #12B76A" : "1.5px solid #B0BAC9",
                  }}
                >
                  {it.concluido && <Check className="h-3 w-3 text-white" />}
                </button>
                <span
                  className="flex-1"
                  style={{
                    fontSize: 13,
                    color: it.concluido ? "#6B7A90" : "#0D1117",
                    textDecoration: it.concluido ? "line-through" : "none",
                  }}
                >
                  {it.item}
                </span>
                {it.foto && (
                  <a
                    href={it.foto}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: "#1E6FBF" }}
                  >
                    Ver foto
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* RETRABALHOS */}
      <Card
        title="Retrabalhos"
        right={
          <Dialog open={retOpen} onOpenChange={setRetOpen}>
            <DialogTrigger asChild>
              <button
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5"
                style={{ fontSize: 12, color: "#1E6FBF", border: "1px solid #E8ECF2" }}
              >
                <Plus className="h-3 w-3" />
                Registrar retrabalho
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar retrabalho</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label>Motivo</Label>
                  <Textarea
                    value={retForm.motivo}
                    onChange={(e) => setRetForm({ ...retForm, motivo: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Responsável</Label>
                  <Select
                    value={retForm.responsavel}
                    onValueChange={(v) => setRetForm({ ...retForm, responsavel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Custo estimado (R$)</Label>
                  <Input
                    type="number"
                    value={retForm.custo}
                    onChange={(e) => setRetForm({ ...retForm, custo: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRetOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => addRetrabalho.mutate()}
                  disabled={addRetrabalho.isPending}
                  style={{ backgroundColor: "#1E6FBF" }}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {pendentes > 0 && (
          <div
            className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: "#FEF3C7", color: "#E8A020", fontSize: 12 }}
          >
            <AlertTriangle className="h-4 w-4" />
            Existem retrabalhos não resolvidos. Resolva para avançar para pós-venda.
          </div>
        )}

        {retrabalhos.length === 0 ? (
          <span style={{ fontSize: 13, color: "#05873C", fontWeight: 500 }}>
            Nenhum retrabalho registrado ✓
          </span>
        ) : (
          <ul className="flex flex-col gap-2">
            {retrabalhos.map((r) => (
              <li
                key={r.id}
                className="rounded-lg p-3"
                style={{
                  borderLeft: `3px solid ${r.resolvido ? "#12B76A" : "#E53935"}`,
                  backgroundColor: "#F7F9FC",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>{r.motivo}</p>
                    <div className="mt-1 flex gap-3" style={{ fontSize: 11, color: "#6B7A90" }}>
                      <span>Resp.: {r.responsavel ? userMap.get(r.responsavel) ?? "—" : "—"}</span>
                      <span>Custo: {formatBRL(Number(r.custo))}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRetrabalho.mutate({ id: r.id, resolvido: r.resolvido })}
                    className="rounded-md px-2 py-1"
                    style={{
                      fontSize: 11,
                      color: r.resolvido ? "#05873C" : "#1E6FBF",
                      border: "1px solid #E8ECF2",
                    }}
                  >
                    {r.resolvido ? "Resolvido ✓" : "Marcar resolvido"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

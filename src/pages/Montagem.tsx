import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { checkAgendamentoConflict, diffHoras as diffH } from "@/lib/agendamento-conflict";

const STATUS_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  agendado: { bg: "#E6F3FF", fg: "#1E6FBF", label: "Agendado" },
  em_execucao: { bg: "#FAECE7", fg: "#993C1D", label: "Em andamento" },
  concluido: { bg: "#D1FAE5", fg: "#05873C", label: "Concluído" },
  cancelado: { bg: "#FEE2E2", fg: "#E53935", label: "Cancelado" },
};

function diffHoras(ini?: string | null, fim?: string | null): number {
  if (!ini || !fim) return 0;
  const [h1, m1] = ini.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  return Math.max(0, (h2 + m2 / 60) - (h1 + m1 / 60));
}

export default function Montagem() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  

  const inicioSemana = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset],
  );
  const dias = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(inicioSemana, i)),
    [inicioSemana],
  );
  const inicioStr = format(inicioSemana, "yyyy-MM-dd");
  const fimStr = format(addDays(inicioSemana, 4), "yyyy-MM-dd");

  const { data: equipes = [] } = useQuery({
    queryKey: ["equipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ["agendamentos-semana", inicioStr, fimStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos_montagem")
        .select("*, contratos(id, cliente_nome)")
        .gte("data", inicioStr)
        .lte("data", fimStr)
        .order("data");
      if (error) throw error;
      return data ?? [];
    },
  });

  const equipeMap = new Map(equipes.map((e) => [e.id, e]));
  const editAgendamento = agendamentos.find((a) => a.id === editId) ?? null;

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#0D1117" }}>NEXO Montagem</h1>
        <p style={{ fontSize: 13, color: "#6B7A90", marginTop: 4 }}>
          Agenda e capacidade das equipes
        </p>
      </div>

      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="capacidade">Capacidade</TabsTrigger>
        </TabsList>

        {/* AGENDA */}
        <TabsContent value="agenda" className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="rounded-md p-1.5"
                style={{ border: "0.5px solid #E8ECF2" }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                Semana de {format(inicioSemana, "dd 'de' MMM", { locale: ptBR })} a{" "}
                {format(addDays(inicioSemana, 4), "dd 'de' MMM", { locale: ptBR })}
              </span>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="rounded-md p-1.5"
                style={{ border: "0.5px solid #E8ECF2" }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <AgendarDialog equipes={equipes} onCreated={() => qc.invalidateQueries({ queryKey: ["agendamentos-semana"] })} />
          </div>

          <div className="grid grid-cols-5 gap-3">
            {dias.map((dia) => {
              const diaStr = format(dia, "yyyy-MM-dd");
              const items = agendamentos.filter((a) => a.data === diaStr);
              return (
                <div
                  key={diaStr}
                  className="rounded-xl bg-white"
                  style={{ border: "0.5px solid #E8ECF2", minHeight: 320, padding: 12 }}
                >
                  <div className="mb-2 pb-2" style={{ borderBottom: "0.5px solid #E8ECF2" }}>
                    <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase" }}>
                      {format(dia, "EEE", { locale: ptBR })}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{format(dia, "dd")}</div>
                  </div>
                  {items.length === 0 ? (
                    <div
                      className="flex h-32 items-center justify-center rounded"
                      style={{ border: "1px dashed #E8ECF2" }}
                    >
                      <span style={{ fontSize: 12, color: "#B0BAC9" }}>Livre</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {items.map((a) => {
                        const eq = a.equipe_id ? equipeMap.get(a.equipe_id) : null;
                        const badge = STATUS_BADGE[a.status];
                        return (
                          <button
                            key={a.id}
                            onClick={() => setEditId(a.id)}
                            className="rounded-lg bg-white text-left transition-shadow hover:shadow-sm"
                            style={{
                              border: "0.5px solid #E8ECF2",
                              borderLeft: `3px solid ${eq?.cor ?? "#1E6FBF"}`,
                              padding: 10,
                            }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                              {a.contratos?.cliente_nome ?? "—"}
                            </div>
                            <div style={{ fontSize: 11, color: "#6B7A90" }}>
                              #{a.contrato_id.slice(0, 4)}
                            </div>
                            <div style={{ fontSize: 11, color: "#6B7A90", marginTop: 2 }}>
                              {eq?.nome ?? "Sem equipe"}
                            </div>
                            <div style={{ fontSize: 11, color: "#6B7A90" }}>
                              {a.hora_inicio?.slice(0, 5) ?? "--"}–{a.hora_fim?.slice(0, 5) ?? "--"}
                            </div>
                            <span
                              className="mt-1.5 inline-flex rounded-full px-2 py-0.5"
                              style={{
                                fontSize: 10,
                                backgroundColor: badge?.bg,
                                color: badge?.fg,
                              }}
                            >
                              {badge?.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* CAPACIDADE */}
        <TabsContent value="capacidade" className="mt-4">
          {equipes.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 rounded-xl bg-white py-12"
              style={{ border: "0.5px solid #E8ECF2" }}
            >
              <span style={{ fontSize: 13, color: "#6B7A90" }}>
                Nenhuma equipe cadastrada. Crie equipes para visualizar a capacidade.
              </span>
              <CriarEquipeDialog onCreated={() => qc.invalidateQueries({ queryKey: ["equipes"] })} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {equipes.map((eq) => {
                const dosDias = dias.map((dia) => {
                  const diaStr = format(dia, "yyyy-MM-dd");
                  const horas = agendamentos
                    .filter((a) => a.equipe_id === eq.id && a.data === diaStr)
                    .reduce((acc, a) => acc + diffHoras(a.hora_inicio, a.hora_fim), 0);
                  return { diaStr, dia, horas };
                });
                const totalH = dosDias.reduce((s, d) => s + d.horas, 0);
                const capSemana = Number(eq.capacidade_horas_dia) * 5;
                const pctSemana = capSemana > 0 ? Math.round((totalH / capSemana) * 100) : 0;
                return (
                  <div
                    key={eq.id}
                    className="rounded-xl bg-white p-4"
                    style={{ border: "0.5px solid #E8ECF2" }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: eq.cor }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{eq.nome}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7A90" }}>
                      Capacidade: {Number(eq.capacidade_horas_dia)}h/dia
                    </div>
                    <div className="mt-3 flex items-end gap-2" style={{ height: 80 }}>
                      {dosDias.map((d) => {
                        const pct = Math.min(100, (d.horas / Number(eq.capacidade_horas_dia)) * 100);
                        const cor = pct > 100 ? "#E53935" : pct >= 80 ? "#E8A020" : "#12B76A";
                        return (
                          <div key={d.diaStr} className="flex flex-1 flex-col items-center gap-1">
                            <div className="flex w-full items-end" style={{ height: 60 }}>
                              <div
                                className="w-full rounded-t"
                                style={{
                                  height: `${pct}%`,
                                  backgroundColor: cor,
                                  minHeight: d.horas > 0 ? 4 : 0,
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 10, color: "#6B7A90" }}>
                              {format(d.dia, "EEEEE", { locale: ptBR })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3" style={{ fontSize: 12, color: "#0D1117" }}>
                      {totalH.toFixed(1)} / {capSemana.toFixed(0)} horas ({pctSemana}%)
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-center rounded-xl" style={{ border: "1px dashed #E8ECF2" }}>
                <CriarEquipeDialog onCreated={() => qc.invalidateQueries({ queryKey: ["equipes"] })} />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EditarAgendamentoDialog
        agendamento={editAgendamento}
        equipes={equipes}
        open={!!editId}
        onOpenChange={(o) => !o && setEditId(null)}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["agendamentos-semana"] });
          setEditId(null);
        }}
      />
    </div>
  );
}

// =================== DIALOGS ===================

function AgendarDialog({
  equipes,
  onCreated,
}: {
  equipes: Array<{ id: string; nome: string; cor: string }>;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [contratoId, setContratoId] = useState("");
  const [equipeId, setEquipeId] = useState("");
  const [data, setData] = useState<Date | undefined>();
  const [ini, setIni] = useState("08:00");
  const [fim, setFim] = useState("17:00");

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos-agendar"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select("id, cliente_nome, status")
        .in("status", ["logistica", "montagem"])
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: open,
  });

  const dataStr = data ? format(data, "yyyy-MM-dd") : "";
  const equipeSel = equipes.find((e) => e.id === equipeId);
  const capacidade = (equipeSel as any)?.capacidade_horas_dia ?? 8;

  const { data: check } = useQuery({
    queryKey: ["agendamento-check", equipeId, dataStr, ini, fim, capacidade],
    queryFn: () =>
      checkAgendamentoConflict({
        equipeId: equipeId || null,
        data: dataStr,
        horaInicio: ini || null,
        horaFim: fim || null,
        capacidadeHorasDia: capacidade,
      }),
    enabled: open && !!equipeId && !!dataStr,
  });

  const conflito = check?.conflito ?? null;
  const excedeCapacidade = !!check?.excedeCapacidade;
  const horasReservadas = check?.horasReservadas ?? 0;
  const horasNovas = check?.horasNovas ?? diffH(ini, fim);

  const mut = useMutation({
    mutationFn: async () => {
      if (!contratoId || !data) throw new Error("Preencha contrato e data");
      const result = await checkAgendamentoConflict({
        equipeId: equipeId || null,
        data: dataStr,
        horaInicio: ini || null,
        horaFim: fim || null,
        capacidadeHorasDia: capacidade,
      });
      if (result.error) throw new Error(result.error);
      if (result.conflito)
        throw new Error(
          `Conflito de horário: equipe já agendada das ${result.conflito.hora_inicio?.slice(0, 5)} às ${result.conflito.hora_fim?.slice(0, 5)}`,
        );
      if (result.excedeCapacidade)
        throw new Error(
          `Excede capacidade diária da equipe (${result.capacidade}h). Já reservadas: ${result.horasReservadas.toFixed(1)}h`,
        );
      const { error } = await supabase.from("agendamentos_montagem").insert({
        contrato_id: contratoId,
        equipe_id: equipeId || null,
        data: dataStr,
        hora_inicio: ini || null,
        hora_fim: fim || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Montagem agendada");
      setOpen(false);
      setContratoId("");
      setEquipeId("");
      setData(undefined);
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalH = diffH(ini, fim);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-white"
          style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
        >
          <Plus className="h-4 w-4" /> Agendar montagem
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar montagem</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label>Contrato</Label>
            <Select value={contratoId} onValueChange={setContratoId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.cliente_nome} · #{c.id.slice(0, 4)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Equipe</Label>
            <Select value={equipeId} onValueChange={setEquipeId}>
              <SelectTrigger><SelectValue placeholder="Sem equipe" /></SelectTrigger>
              <SelectContent>
                {equipes.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("justify-start text-left font-normal", !data && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data ? format(data, "dd/MM/yyyy") : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={data} onSelect={setData} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Hora início</Label>
              <Input type="time" value={ini} onChange={(e) => setIni(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Hora fim</Label>
              <Input type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#6B7A90" }}>Total: {totalH.toFixed(1)}h</span>
          {conflito && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
              ⚠ Conflito: equipe já agendada das {conflito.hora_inicio?.slice(0, 5)} às {conflito.hora_fim?.slice(0, 5)} nesta data.
            </div>
          )}
          {!conflito && excedeCapacidade && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-amber-600">
              ⚠ Excede capacidade diária ({capacidade}h). Já reservadas: {horasReservadas.toFixed(1)}h + {horasNovas.toFixed(1)}h novas.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !!conflito || !!excedeCapacidade}
            style={{ backgroundColor: "#1E6FBF" }}
          >
            {mut.isPending ? "Salvando..." : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditarAgendamentoDialog({
  agendamento,
  equipes,
  open,
  onOpenChange,
  onChanged,
}: {
  agendamento: any;
  equipes: Array<{ id: string; nome: string; cor: string; capacidade_horas_dia?: number }>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const [equipeId, setEquipeId] = useState("");
  const [data, setData] = useState<Date | undefined>();
  const [ini, setIni] = useState("08:00");
  const [fim, setFim] = useState("17:00");

  useMemo(() => {
    if (agendamento) {
      setEquipeId(agendamento.equipe_id ?? "");
      setData(agendamento.data ? new Date(agendamento.data + "T00:00:00") : undefined);
      setIni(agendamento.hora_inicio?.slice(0, 5) ?? "08:00");
      setFim(agendamento.hora_fim?.slice(0, 5) ?? "17:00");
    }
  }, [agendamento?.id]);

  const dataStr = data ? format(data, "yyyy-MM-dd") : "";
  const equipeSel = equipes.find((e) => e.id === equipeId) as any;
  const capacidade = equipeSel?.capacidade_horas_dia ?? 8;

  const { data: check } = useQuery({
    queryKey: ["agendamento-check-edit", agendamento?.id, equipeId, dataStr, ini, fim],
    queryFn: () =>
      checkAgendamentoConflict({
        equipeId: equipeId || null,
        data: dataStr,
        horaInicio: ini || null,
        horaFim: fim || null,
        capacidadeHorasDia: capacidade,
        excludeId: agendamento?.id,
      }),
    enabled: open && !!equipeId && !!dataStr,
  });

  const conflito = check?.conflito ?? null;
  const excede = !!check?.excedeCapacidade;

  const salvar = useMutation({
    mutationFn: async () => {
      if (!agendamento) return;
      if (!data) throw new Error("Selecione a data");
      const result = await checkAgendamentoConflict({
        equipeId: equipeId || null,
        data: dataStr,
        horaInicio: ini || null,
        horaFim: fim || null,
        capacidadeHorasDia: capacidade,
        excludeId: agendamento.id,
      });
      if (result.error) throw new Error(result.error);
      if (result.conflito)
        throw new Error(
          `Conflito: equipe já agendada das ${result.conflito.hora_inicio?.slice(0, 5)} às ${result.conflito.hora_fim?.slice(0, 5)}`,
        );
      if (result.excedeCapacidade)
        throw new Error(
          `Excede capacidade diária (${result.capacidade}h). Já reservadas: ${result.horasReservadas.toFixed(1)}h`,
        );
      const { error } = await supabase
        .from("agendamentos_montagem")
        .update({
          equipe_id: equipeId || null,
          data: dataStr,
          hora_inicio: ini || null,
          hora_fim: fim || null,
        })
        .eq("id", agendamento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento atualizado");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelar = useMutation({
    mutationFn: async () => {
      if (!agendamento) return;
      const { error } = await supabase
        .from("agendamentos_montagem")
        .update({ status: "cancelado" })
        .eq("id", agendamento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento cancelado");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!agendamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar agendamento</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div style={{ fontSize: 13, color: "#6B7A90" }}>
            Contrato: <strong>{agendamento.contratos?.cliente_nome ?? "—"}</strong> · #
            {agendamento.contrato_id?.slice(0, 4)}
          </div>
          <div className="flex flex-col gap-1">
            <Label>Equipe</Label>
            <Select value={equipeId} onValueChange={setEquipeId}>
              <SelectTrigger><SelectValue placeholder="Sem equipe" /></SelectTrigger>
              <SelectContent>
                {equipes.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !data && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data ? format(data, "dd/MM/yyyy") : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={data} onSelect={setData} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Hora início</Label>
              <Input type="time" value={ini} onChange={(e) => setIni(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Hora fim</Label>
              <Input type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
          {conflito && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
              ⚠ Conflito: equipe já agendada das {conflito.hora_inicio?.slice(0, 5)} às {conflito.hora_fim?.slice(0, 5)}.
            </div>
          )}
          {!conflito && excede && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-amber-600">
              ⚠ Excede capacidade diária ({check?.capacidade}h).
            </div>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="destructive"
            onClick={() => cancelar.mutate()}
            disabled={cancelar.isPending || agendamento.status === "cancelado"}
          >
            {cancelar.isPending ? "Cancelando..." : "Cancelar agendamento"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button
              onClick={() => salvar.mutate()}
              disabled={salvar.isPending || !!conflito || excede}
              style={{ backgroundColor: "#1E6FBF" }}
            >
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CriarEquipeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#1E6FBF");
  const [cap, setCap] = useState("8");

  const mut = useMutation({
    mutationFn: async () => {
      if (!nome) throw new Error("Informe o nome");
      const { data: u } = await supabase.from("usuarios").select("loja_id").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").maybeSingle();
      if (!u?.loja_id) throw new Error("Usuário sem loja");
      const { error } = await supabase.from("equipes").insert({
        loja_id: u.loja_id,
        nome,
        cor,
        capacidade_horas_dia: Number(cap) || 8,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipe criada");
      setOpen(false);
      setNome("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2"
          style={{ fontSize: 13, color: "#1E6FBF", border: "1px solid #E8ECF2" }}
        >
          <Plus className="h-4 w-4" /> Nova equipe
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar equipe</DialogTitle>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} style={{ backgroundColor: "#1E6FBF" }}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Registro = {
  id: string;
  tipo: "entrada" | "saida";
  registrado_em: string;
  usuario_id: string;
  loja_id: string;
};

type Membro = { id: string; nome: string };
type AppRole = "admin" | "gerente" | "vendedor" | "tecnico" | "montador" | "franqueador";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function endOfTodayISO() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
function fmtHM(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h ${m}min`;
}
function fmtDurShort(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtWeekLabel(monday: Date) {
  const friday = addDays(monday, 4);
  const sameMonth = monday.getMonth() === friday.getMonth();
  const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "short" });
  if (sameMonth) {
    return `Semana ${monday.getDate()}–${friday.getDate()} ${monthFmt
      .format(monday)
      .replace(".", "")}`;
  }
  return `Semana ${monday.getDate()} ${monthFmt
    .format(monday)
    .replace(".", "")} – ${friday.getDate()} ${monthFmt
    .format(friday)
    .replace(".", "")}`;
}
function pad2(n: number) {
  return n.toString().padStart(2, "0");
}
function toLocalTimeInput(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function combineDateAndTime(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const x = new Date(day);
  x.setHours(h, m, 0, 0);
  return x;
}

export function PontoRapidoCard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  const { data: registros } = useQuery({
    queryKey: ["registros-ponto-hoje", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Registro[]> => {
      const { data, error } = await supabase
        .from("registros_ponto")
        .select("id, tipo, registrado_em, usuario_id, loja_id")
        .eq("usuario_id", user!.id)
        .gte("registrado_em", startOfTodayISO())
        .lte("registrado_em", endOfTodayISO())
        .order("registrado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Registro[];
    },
  });

  const entrada = useMemo(
    () => registros?.find((r) => r.tipo === "entrada"),
    [registros],
  );
  const saida = useMemo(
    () => [...(registros ?? [])].reverse().find((r) => r.tipo === "saida"),
    [registros],
  );

  useEffect(() => {
    if (!entrada || saida) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [entrada, saida]);

  async function registrar(tipo: "entrada" | "saida") {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const { data: u, error: uErr } = await supabase
        .from("usuarios")
        .select("loja_id")
        .eq("id", user.id)
        .maybeSingle();
      if (uErr) throw uErr;
      if (!u?.loja_id) throw new Error("Sua loja não está configurada");

      const { error } = await supabase.from("registros_ponto").insert({
        usuario_id: user.id,
        loja_id: u.loja_id,
        tipo,
      });
      if (error) throw error;
      toast.success(tipo === "entrada" ? "Entrada registrada" : "Saída registrada");
      qc.invalidateQueries({ queryKey: ["registros-ponto-hoje", user.id] });
      qc.invalidateQueries({ queryKey: ["registros-ponto-semana"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar ponto");
    } finally {
      setSubmitting(false);
    }
  }

  let body: JSX.Element;
  if (!entrada) {
    body = (
      <div className="flex items-center justify-between gap-4">
        <p style={{ fontSize: 14, color: "#FFFFFF" }}>
          Você ainda não registrou entrada hoje
        </p>
        <button
          disabled={submitting}
          onClick={() => registrar("entrada")}
          className="rounded-lg px-4 py-2 text-white disabled:opacity-60"
          style={{ backgroundColor: "#12B76A", fontSize: 13 }}
        >
          Registrar entrada →
        </button>
      </div>
    );
  } else if (!saida) {
    const elapsed = now - new Date(entrada.registrado_em).getTime();
    body = (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p style={{ fontSize: 13, color: "#12B76A" }}>
            Entrada registrada às {fmtHM(new Date(entrada.registrado_em))}
          </p>
          <p style={{ fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginTop: 4 }}>
            {fmtDuration(elapsed)} trabalhados
          </p>
        </div>
        <button
          disabled={submitting}
          onClick={() => registrar("saida")}
          className="rounded-lg px-4 py-2 text-white disabled:opacity-60"
          style={{ backgroundColor: "#E53935", fontSize: 13 }}
        >
          Registrar saída
        </button>
      </div>
    );
  } else {
    const total =
      new Date(saida.registrado_em).getTime() -
      new Date(entrada.registrado_em).getTime();
    body = (
      <div>
        <p style={{ fontSize: 13, color: "#9DA8B8" }}>Ponto do dia concluído ✓</p>
        <p style={{ fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginTop: 4 }}>
          {fmtDuration(total)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl" style={{ backgroundColor: "#0D1117", padding: 20 }}>
      {body}
    </div>
  );
}

// ---- Adjust modal ----
const AdjustSchema = z.object({
  entrada: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  saida: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida").or(z.literal("")),
  motivo: z.string().trim().min(3, "Informe o motivo").max(500),
});

type CellContext = {
  membro: Membro;
  day: Date;
  entrada: Registro | null;
  saida: Registro | null;
};

function AjustePontoDialog({
  ctx,
  onClose,
  onSaved,
}: {
  ctx: CellContext | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ctx) return;
    setEntrada(ctx.entrada ? toLocalTimeInput(new Date(ctx.entrada.registrado_em)) : "");
    setSaida(ctx.saida ? toLocalTimeInput(new Date(ctx.saida.registrado_em)) : "");
    setMotivo("");
  }, [ctx]);

  async function handleSave() {
    if (!ctx) return;
    const parsed = AdjustSchema.safeParse({ entrada, saida, motivo });
    if (!parsed.success) {
      toast.error(Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Dados inválidos");
      return;
    }
    if (!ctx.entrada) {
      toast.error("Sem registro de entrada para ajustar nesta data");
      return;
    }
    setSaving(true);
    try {
      const { data: me } = await supabase.auth.getUser();
      const ajustadoPor = me.user?.id;
      if (!ajustadoPor) throw new Error("Sessão inválida");

      const { data: u } = await supabase
        .from("usuarios")
        .select("nome")
        .eq("id", ajustadoPor)
        .maybeSingle();

      // Update entrada
      const novaEntrada = combineDateAndTime(ctx.day, entrada);
      const oldEntrada = new Date(ctx.entrada.registrado_em);
      if (novaEntrada.getTime() !== oldEntrada.getTime()) {
        const { error: upErr } = await supabase
          .from("registros_ponto")
          .update({ registrado_em: novaEntrada.toISOString() })
          .eq("id", ctx.entrada.id);
        if (upErr) throw upErr;

        const { error: aErr } = await supabase.from("registros_ponto_audit").insert({
          registro_id: ctx.entrada.id,
          usuario_id: ctx.entrada.usuario_id,
          loja_id: ctx.entrada.loja_id,
          ajustado_por: ajustadoPor,
          ajustado_por_nome: u?.nome ?? null,
          valor_anterior: oldEntrada.toISOString(),
          valor_novo: novaEntrada.toISOString(),
          motivo,
        });
        if (aErr) throw aErr;
      }

      // Update saida (if provided and one exists)
      if (saida && ctx.saida) {
        const novaSaida = combineDateAndTime(ctx.day, saida);
        const oldSaida = new Date(ctx.saida.registrado_em);
        if (novaSaida.getTime() !== oldSaida.getTime()) {
          const { error: upErr } = await supabase
            .from("registros_ponto")
            .update({ registrado_em: novaSaida.toISOString() })
            .eq("id", ctx.saida.id);
          if (upErr) throw upErr;

          const { error: aErr } = await supabase.from("registros_ponto_audit").insert({
            registro_id: ctx.saida.id,
            usuario_id: ctx.saida.usuario_id,
            loja_id: ctx.saida.loja_id,
            ajustado_por: ajustadoPor,
            ajustado_por_nome: u?.nome ?? null,
            valor_anterior: oldSaida.toISOString(),
            valor_novo: novaSaida.toISOString(),
            motivo,
          });
          if (aErr) throw aErr;
        }
      }

      toast.success("Ponto ajustado");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao ajustar ponto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!ctx} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle style={{ fontSize: 16 }}>
            Ajustar ponto · {ctx?.membro.nome}
          </DialogTitle>
          <p style={{ fontSize: 12, color: "#6B7A90" }}>
            {ctx?.day.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 12, color: "#6B7A90" }}>Entrada</span>
            <input
              type="time"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              className="rounded-md border px-2 py-1.5"
              style={{ borderColor: "#E8ECF2", fontSize: 13 }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 12, color: "#6B7A90" }}>Saída</span>
            <input
              type="time"
              value={saida}
              onChange={(e) => setSaida(e.target.value)}
              className="rounded-md border px-2 py-1.5"
              style={{ borderColor: "#E8ECF2", fontSize: 13 }}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span style={{ fontSize: 12, color: "#6B7A90" }}>Motivo *</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={500}
            className="rounded-md border px-2 py-1.5"
            style={{ borderColor: "#E8ECF2", fontSize: 13 }}
            placeholder="Descreva o motivo do ajuste"
          />
        </label>
        <DialogFooter>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2"
            style={{ fontSize: 13, color: "#6B7A90" }}
          >
            Cancelar
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="rounded-md px-3 py-2 text-white disabled:opacity-60"
            style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
          >
            Salvar ajuste
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SemanaPontoCard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [membroId, setMembroId] = useState<string>("all");
  const [adjustCtx, setAdjustCtx] = useState<CellContext | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 5), [weekStart]);
  const weekLabel = useMemo(() => fmtWeekLabel(weekStart), [weekStart]);
  const todayMid = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { data: roles } = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
  const canAdjust = !!roles?.some((r) => r === "admin" || r === "gerente");

  const { data: membros } = useQuery({
    queryKey: ["ponto-membros"],
    queryFn: async (): Promise<Membro[]> => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Membro[];
    },
  });

  const { data: registros, isLoading } = useQuery({
    queryKey: ["registros-ponto-semana", weekStart.toISOString(), membroId],
    queryFn: async (): Promise<Registro[]> => {
      let q = supabase
        .from("registros_ponto")
        .select("id, tipo, registrado_em, usuario_id, loja_id")
        .gte("registrado_em", weekStart.toISOString())
        .lt("registrado_em", weekEnd.toISOString())
        .order("registrado_em", { ascending: true });
      if (membroId !== "all") q = q.eq("usuario_id", membroId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Registro[];
    },
  });

  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const dayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit" });

  const byUserDay = useMemo(() => {
    const map = new Map<string, Map<string, Registro[]>>();
    (registros ?? []).forEach((r) => {
      const dayKey = new Date(r.registrado_em).toDateString();
      if (!map.has(r.usuario_id)) map.set(r.usuario_id, new Map());
      const dm = map.get(r.usuario_id)!;
      if (!dm.has(dayKey)) dm.set(dayKey, []);
      dm.get(dayKey)!.push(r);
    });
    return map;
  }, [registros]);

  const usersToShow = useMemo(() => {
    if (membroId !== "all") return (membros ?? []).filter((m) => m.id === membroId);
    const ids = new Set(Array.from(byUserDay.keys()));
    return (membros ?? []).filter((m) => ids.has(m.id));
  }, [membros, byUserDay, membroId]);

  function getCell(userId: string, day: Date) {
    const recs = byUserDay.get(userId)?.get(day.toDateString()) ?? [];
    const ent = recs.find((r) => r.tipo === "entrada") ?? null;
    const sai = [...recs].reverse().find((r) => r.tipo === "saida") ?? null;
    return { ent, sai };
  }

  function totalMs(userId: string) {
    let sum = 0;
    for (const d of days) {
      const { ent, sai } = getCell(userId, d);
      if (ent && sai) {
        sum += new Date(sai.registrado_em).getTime() - new Date(ent.registrado_em).getTime();
      }
    }
    return sum;
  }
  function totalColor(ms: number) {
    const h = ms / 3600000;
    if (h >= 40) return "#12B76A";
    if (h >= 30) return "#E8A020";
    return "#E53935";
  }

  return (
    <div
      className="rounded-xl bg-white"
      style={{ border: "0.5px solid #E8ECF2", padding: 16 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="rounded-md p-1.5 hover:bg-[#F1F2F4]"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: "#6B7A90" }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
            {weekLabel}
          </span>
          <button
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="rounded-md p-1.5 hover:bg-[#F1F2F4]"
            aria-label="Próxima semana"
          >
            <ChevronRight className="h-4 w-4" style={{ color: "#6B7A90" }} />
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="ml-1 rounded-md px-2 py-1"
            style={{ fontSize: 12, color: "#1E6FBF" }}
          >
            Hoje
          </button>
        </div>

        <div style={{ width: 220 }}>
          <Select value={membroId} onValueChange={setMembroId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos os membros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os membros</SelectItem>
              {(membros ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full" style={{ fontSize: 13, borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E8ECF2" }}>
              <th
                className="py-2 pr-3 text-left"
                style={{ fontSize: 12, color: "#6B7A90", fontWeight: 500 }}
              >
                Membro
              </th>
              {days.map((d) => (
                <th
                  key={d.toDateString()}
                  className="py-2 px-2 text-left capitalize"
                  style={{ fontSize: 12, color: "#6B7A90", fontWeight: 500 }}
                >
                  {dayFmt.format(d).replace(".", "")}
                </th>
              ))}
              <th
                className="py-2 px-2 text-right"
                style={{ fontSize: 12, color: "#6B7A90", fontWeight: 500 }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="py-6 text-center" style={{ color: "#6B7A90" }}>
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && usersToShow.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center" style={{ color: "#6B7A90" }}>
                  Sem registros nesta semana
                </td>
              </tr>
            )}
            {!isLoading &&
              usersToShow.map((m) => {
                const tot = totalMs(m.id);
                return (
                  <tr key={m.id}>
                    <td
                      className="py-2 pr-3"
                      style={{ color: "#0D1117", borderBottom: "0.5px solid #E8ECF2" }}
                    >
                      {m.nome}
                    </td>
                    {days.map((d) => {
                      const { ent, sai } = getCell(m.id, d);
                      const isFuture = d.getTime() > todayMid.getTime();
                      let bg = "#FFFFFF";
                      let content: JSX.Element;

                      if (ent && sai) {
                        const dur =
                          new Date(sai.registrado_em).getTime() -
                          new Date(ent.registrado_em).getTime();
                        bg = "#F0FDF9";
                        content = (
                          <span style={{ fontSize: 12, color: "#0D1117" }}>
                            {fmtHM(new Date(ent.registrado_em))}–
                            {fmtHM(new Date(sai.registrado_em))}{" "}
                            <span style={{ color: "#6B7A90" }}>· {fmtDurShort(dur)}</span>
                          </span>
                        );
                      } else if (ent && !sai) {
                        bg = "#FEF8F0";
                        content = (
                          <span style={{ fontSize: 12, color: "#B45309" }}>
                            {fmtHM(new Date(ent.registrado_em))}–?
                          </span>
                        );
                      } else if (isFuture) {
                        bg = "#F5F7FA";
                        content = <span style={{ color: "#B0BAC9" }}>—</span>;
                      } else {
                        bg = "#FFF8F8";
                        content = <span style={{ color: "#B0BAC9" }}>—</span>;
                      }

                      const clickable = canAdjust && !isFuture;
                      return (
                        <td
                          key={d.toDateString()}
                          onClick={
                            clickable
                              ? () =>
                                  setAdjustCtx({ membro: m, day: d, entrada: ent, saida: sai })
                              : undefined
                          }
                          className={clickable ? "cursor-pointer" : ""}
                          style={{
                            backgroundColor: bg,
                            padding: "8px",
                            borderBottom: "0.5px solid #E8ECF2",
                            verticalAlign: "middle",
                          }}
                          title={clickable ? "Ajustar ponto" : undefined}
                        >
                          {content}
                        </td>
                      );
                    })}
                    <td
                      className="py-2 px-2 text-right"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: tot > 0 ? totalColor(tot) : "#B0BAC9",
                        borderBottom: "0.5px solid #E8ECF2",
                      }}
                    >
                      {tot > 0 ? fmtDurShort(tot) : "—"}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <AjustePontoDialog
        ctx={adjustCtx}
        onClose={() => setAdjustCtx(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["registros-ponto-semana"] });
          qc.invalidateQueries({ queryKey: ["registros-ponto-hoje"] });
        }}
      />
    </div>
  );
}

export function PontoTab() {
  return (
    <div className="flex flex-col gap-4">
      <PontoRapidoCard />
      <SemanaPontoCard />
    </div>
  );
}

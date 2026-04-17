import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Registro = {
  id: string;
  tipo: "entrada" | "saida";
  registrado_em: string;
  usuario_id: string;
};

type Membro = { id: string; nome: string };

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

// ---- Week helpers (Mon–Fri visible, week starts Monday) ----
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
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
        .select("id, tipo, registrado_em, usuario_id")
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

function SemanaPontoCard() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [membroId, setMembroId] = useState<string>("all");

  const weekEnd = useMemo(() => addDays(weekStart, 5), [weekStart]); // exclusive end (Sat)
  const weekLabel = useMemo(() => fmtWeekLabel(weekStart), [weekStart]);

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
        .select("id, tipo, registrado_em, usuario_id")
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

  // group by user + day
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
        <table className="w-full" style={{ fontSize: 13 }}>
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
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="py-6 text-center" style={{ color: "#6B7A90" }}>
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && usersToShow.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center" style={{ color: "#6B7A90" }}>
                  Sem registros nesta semana
                </td>
              </tr>
            )}
            {!isLoading &&
              usersToShow.map((m) => (
                <tr key={m.id} style={{ borderBottom: "0.5px solid #E8ECF2" }}>
                  <td className="py-2 pr-3" style={{ color: "#0D1117" }}>
                    {m.nome}
                  </td>
                  {days.map((d) => {
                    const recs =
                      byUserDay.get(m.id)?.get(d.toDateString()) ?? [];
                    const ent = recs.find((r) => r.tipo === "entrada");
                    const sai = [...recs].reverse().find((r) => r.tipo === "saida");
                    return (
                      <td
                        key={d.toDateString()}
                        className="py-2 px-2"
                        style={{ color: "#0D1117" }}
                      >
                        {ent || sai ? (
                          <div className="flex flex-col">
                            <span style={{ fontSize: 12 }}>
                              {ent ? fmtHM(new Date(ent.registrado_em)) : "—"}
                              {" → "}
                              {sai ? fmtHM(new Date(sai.registrado_em)) : "…"}
                            </span>
                            {ent && sai && (
                              <span style={{ fontSize: 11, color: "#6B7A90" }}>
                                {fmtDuration(
                                  new Date(sai.registrado_em).getTime() -
                                    new Date(ent.registrado_em).getTime(),
                                )}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#B0BAC9" }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
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

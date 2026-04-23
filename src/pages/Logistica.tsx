import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NovaEntregaDialog } from "@/components/logistica/NovaEntregaDialog";
import { EntregaDrawer, type EntregaDrawerData } from "@/components/logistica/EntregaDrawer";
import { StatusBadge, type StatusVisual } from "@/components/logistica/StatusBadge";
import {
  addDays,
  dayShortNames,
  fmtISODate,
  startOfWeek,
  weekDays,
  weekRangeLabel,
} from "@/lib/agenda-week";

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="rounded-xl bg-card p-5"
      style={{ border: "0.5px solid hsl(var(--border))", borderTop: accent ? `3px solid ${accent}` : undefined }}
    >
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

interface EntregaRow {
  id: string;
  contrato_id: string;
  cliente_nome: string;
  endereco: string | null;
  data_prevista: string | null;
  turno: "manha" | "tarde" | "dia_todo";
  responsavel: string | null;
  observacoes: string | null;
  status_visual: StatusVisual;
}

function shortAddress(addr: string | null): string {
  if (!addr) return "—";
  // Pega só rua + número (parte antes da primeira vírgula, ou primeira linha)
  const firstLine = addr.split(/[\n,]/)[0]?.trim();
  return firstLine || "—";
}

export default function Logistica() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [anchor, setAnchor] = useState<Date>(() => startOfWeek(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | undefined>();
  const [createTurno, setCreateTurno] = useState<"manha"|"tarde"|undefined>();
  const [drawerEntrega, setDrawerEntrega] = useState<EntregaDrawerData | null>(null);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const rangeStart = fmtISODate(days[0]);
  const rangeEnd = fmtISODate(addDays(days[days.length - 1], 1));

  const { data: entregas, isLoading } = useQuery({
    queryKey: ["logistica-list", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas")
        .select(`
          id, contrato_id, data_prevista, status, status_visual, turno, responsavel,
          endereco, rota, observacoes,
          contratos:contrato_id ( cliente_nome, cliente_contato )
        `)
        .gte("data_prevista", rangeStart)
        .lt("data_prevista", rangeEnd)
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((e): EntregaRow => {
        const c = e.contratos as { cliente_nome?: string | null; cliente_contato?: string | null } | null;
        return {
          id: e.id,
          contrato_id: e.contrato_id,
          cliente_nome: c?.cliente_nome ?? "—",
          endereco: e.endereco ?? e.rota ?? c?.cliente_contato ?? null,
          data_prevista: e.data_prevista,
          turno: (e.turno ?? "manha") as EntregaRow["turno"],
          responsavel: e.responsavel ?? null,
          observacoes: e.observacoes ?? null,
          status_visual: (e.status_visual ?? (e.status === "confirmada" ? "entregue" : "agendado")) as StatusVisual,
        };
      });
    },
  });

  // Métricas (toda a semana visível)
  const metrics = useMemo(() => {
    const today = fmtISODate(new Date());
    let aAgendar = 0, agendadas = 0, hoje = 0;
    for (const e of entregas ?? []) {
      if (e.status_visual === "a_agendar") aAgendar++;
      if (e.status_visual === "agendado" || e.status_visual === "reagendado") agendadas++;
      if (e.status_visual === "entregue" && e.data_prevista === today) hoje++;
    }
    return { aAgendar, agendadas, hoje };
  }, [entregas]);

  const filtered = useMemo(() => {
    return (entregas ?? []).filter((e) => {
      if (statusFilter !== "all" && e.status_visual !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.cliente_nome.toLowerCase().includes(q) && !e.contrato_id.slice(0,4).includes(q)) return false;
      }
      return true;
    });
  }, [entregas, statusFilter, search]);

  // Buckets por dia/turno
  const buckets = useMemo(() => {
    const map = new Map<string, { manha: EntregaRow[]; tarde: EntregaRow[] }>();
    for (const d of days) map.set(fmtISODate(d), { manha: [], tarde: [] });
    for (const e of filtered) {
      if (!e.data_prevista) continue;
      const slot = map.get(e.data_prevista);
      if (!slot) continue;
      if (e.turno === "tarde") slot.tarde.push(e);
      else if (e.turno === "dia_todo") {
        slot.manha.push(e);
        slot.tarde.push(e);
      } else slot.manha.push(e);
    }
    return map;
  }, [filtered, days]);

  const todayISO = fmtISODate(new Date());

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">NEXO Logística</h1>
          <p className="text-sm text-muted-foreground">Agenda visual semanal de entregas</p>
        </div>
        <Button onClick={() => { setCreateDate(undefined); setCreateTurno(undefined); setCreateOpen(true); }} className="w-full sm:w-auto">
          <Plus className="mr-1 h-4 w-4" /> Nova Entrega
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Entregas a agendar" value={String(metrics.aAgendar)} accent="#E8A020" />
        <MetricCard label="Entregas agendadas" value={String(metrics.agendadas)} accent="#1E6FBF" />
        <MetricCard label="Confirmadas hoje" value={String(metrics.hoje)} accent="#12B76A" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="a_agendar">A agendar</SelectItem>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="em_rota">Em rota</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
            <SelectItem value="reagendado">Reagendado</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="max-w-sm"
          placeholder="Buscar cliente ou nº..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Navegação semana */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between rounded-xl bg-card px-4 py-3 gap-4" style={{ border: "0.5px solid hsl(var(--border))" }}>
        <Button variant="ghost" size="sm" onClick={() => setAnchor((d) => addDays(d, -7))} className="w-full sm:w-auto justify-start">
          <ChevronLeft className="h-4 w-4 mr-1" /> Semana anterior
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">{weekRangeLabel(anchor)}</span>
          <Button variant="outline" size="sm" onClick={() => setAnchor(startOfWeek(new Date()))}>Hoje</Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setAnchor((d) => addDays(d, 7))} className="w-full sm:w-auto justify-end">
          Próxima semana <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Grade semanal */}
      <div className="overflow-x-auto rounded-xl bg-card border border-border">
        <div className="grid min-w-[1000px]" style={{ gridTemplateColumns: "80px repeat(6, minmax(0, 1fr))" }}>
          {/* Header */}
          <div className="border-b border-r bg-muted/40 px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground"></div>
          {days.map((d, i) => {
            const iso = fmtISODate(d);
            const slot = buckets.get(iso);
            const count = (slot?.manha.length ?? 0) + (slot?.tarde.length ?? 0);
            const isToday = iso === todayISO;
            return (
              <div
                key={iso}
                className="border-b border-r px-3 py-2 last:border-r-0"
                style={{ backgroundColor: isToday ? "hsl(var(--accent))" : "hsl(var(--muted) / 0.4)" }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {dayShortNames[i]} {d.getDate()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {count} {count === 1 ? "entrega" : "entregas"}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Linha Manhã */}
          <div className="border-r bg-muted/20 px-3 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            Manhã
          </div>
          {days.map((d) => {
            const iso = fmtISODate(d);
            const items = buckets.get(iso)?.manha ?? [];
            return <DaySlot key={`m-${iso}`} items={items} onPick={setDrawerEntrega} onAdd={() => { setCreateDate(iso); setCreateTurno("manha"); setCreateOpen(true); }} />;
          })}

          {/* Linha Tarde */}
          <div className="border-t border-r bg-muted/20 px-3 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            Tarde
          </div>
          {days.map((d) => {
            const iso = fmtISODate(d);
            const items = buckets.get(iso)?.tarde ?? [];
            return <DaySlot key={`t-${iso}`} items={items} onPick={setDrawerEntrega} onAdd={() => { setCreateDate(iso); setCreateTurno("tarde"); setCreateOpen(true); }} topBorder />;
          })}
        </div>

        {isLoading && (
          <div className="border-t px-4 py-6 text-center text-sm text-muted-foreground">Carregando agenda...</div>
        )}
      </div>

      <NovaEntregaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDate={createDate}
        defaultTurno={createTurno}
      />
      <EntregaDrawer
        open={!!drawerEntrega}
        onOpenChange={(o) => !o && setDrawerEntrega(null)}
        entrega={drawerEntrega}
      />
    </div>
  );
}

function DaySlot({
  items,
  onPick,
  onAdd,
  topBorder,
}: {
  items: EntregaRow[];
  onPick: (e: EntregaDrawerData) => void;
  onAdd: () => void;
  topBorder?: boolean;
}) {
  return (
    <div
      className={`border-r px-2 py-2 last:border-r-0 ${topBorder ? "border-t" : ""} min-h-[160px] flex flex-col gap-1.5`}
    >
      {items.length === 0 && (
        <button
          onClick={onAdd}
          className="flex h-full min-h-[140px] w-full items-center justify-center rounded-lg border border-dashed text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          + Adicionar
        </button>
      )}
      {items.map((e) => (
        <button
          key={e.id}
          onClick={() => onPick(e)}
          className="rounded-lg border bg-card p-2 text-left hover:border-primary/40 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between gap-1">
            <span className="line-clamp-1 text-[12px] font-medium text-foreground">{e.cliente_nome}</span>
          </div>
          <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{shortAddress(e.endereco)}</div>
          <div className="mt-1.5"><StatusBadge status={e.status_visual} /></div>
        </button>
      ))}
      {items.length > 0 && (
        <button
          onClick={onAdd}
          className="mt-auto rounded-md py-1 text-[10px] text-muted-foreground hover:text-primary"
        >
          + adicionar
        </button>
      )}
    </div>
  );
}

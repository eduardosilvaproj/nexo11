import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, FileText, BarChart3, Factory, Wrench, Ruler, CheckCircle2, Truck, Sparkles } from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type Row = {
  id: string;
  cliente_nome: string | null;
  status: string | null;
  vendedor_id: string | null;
  data_criacao: string | null;
  valor_venda: number | null;
  margem_prevista: number | null;
  margem_realizada: number | null;
  desvio_total: number | null;
  custo_produto_real: number | null;
  custo_montagem_real: number | null;
  custo_frete_real: number | null;
  custo_comissao_real: number | null;
  outros_custos_reais: number | null;
  custo_produto_previsto: number | null;
  custo_montagem_previsto: number | null;
  custo_frete_previsto: number | null;
  custo_comissao_previsto: number | null;
  outros_custos_previstos: number | null;
};

type DrillData = {
  contratoId: string;
  cliente: string;
  receita: number;
  prevTotal: number;
  realTotal: number;
  pendTotal: number;
  margemPrev: number;
  margemReal: number;
  margemPotencial: number;
  fabrica: number;
  frete: number;
  outros: number;
  montagem: { pago: number; pendente: number; ambPagos: number; ambTotal: number };
  medicao: { pago: number; pendente: number; ambPagos: number; ambTotal: number };
  conferencia: { pago: number; pendente: number; ambPagos: number; ambTotal: number };
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Dre() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const podeVerRanking = hasRole("admin") || hasRole("gerente") || hasRole("franqueador");
  const today = new Date();
  const [mes, setMes] = useState<number>(today.getMonth());
  const [ano, setAno] = useState<number>(today.getFullYear());
  const [vendedor, setVendedor] = useState<string>("all");
  const [statusFiltro, setStatusFiltro] = useState<string>("all");
  const [rankBy, setRankBy] = useState<"margem" | "faturamento">("margem");
  const [rows, setRows] = useState<Row[]>([]);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  const [evolucao, setEvolucao] = useState<
    { mes: string; prevista: number | null; realizada: number | null }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Opções de mês/ano (12 meses retroativos + atual)
  const periodos = useMemo(() => {
    const arr: { value: string; label: string; mes: number; ano: number }[] = [];
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(base);
      d.setMonth(base.getMonth() - i);
      arr.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
        mes: d.getMonth(),
        ano: d.getFullYear(),
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const inicio = new Date(ano, mes, 1).toISOString();
      const fim = new Date(ano, mes + 1, 1).toISOString();

      let q = supabase
        .from("vw_contratos_dre")
        .select(
          "id, cliente_nome, status, vendedor_id, data_criacao, valor_venda, margem_prevista, margem_realizada, desvio_total, custo_produto_real, custo_montagem_real, custo_frete_real, custo_comissao_real, outros_custos_reais, custo_produto_previsto, custo_montagem_previsto, custo_frete_previsto, custo_comissao_previsto, outros_custos_previstos"
        )
        .gte("data_criacao", inicio)
        .lt("data_criacao", fim)
        .order("data_criacao", { ascending: false });

      if (vendedor !== "all") q = q.eq("vendedor_id", vendedor);
      if (statusFiltro === "andamento") q = q.neq("status", "finalizado");
      if (statusFiltro === "finalizado") q = q.eq("status", "finalizado");

      const { data } = await q;
      setRows((data as Row[]) ?? []);

      const { data: us } = await supabase
        .from("usuarios_publico")
        .select("id, nome")
        .order("nome");
      setVendedores((us as any) ?? []);

      // Evolução dos últimos 6 meses (margens médias ponderadas)
      const inicio6 = new Date(ano, mes - 5, 1).toISOString();
      const fim6 = new Date(ano, mes + 1, 1).toISOString();
      const { data: hist } = await supabase
        .from("vw_contratos_dre")
        .select("data_criacao, valor_venda, margem_prevista, margem_realizada")
        .gte("data_criacao", inicio6)
        .lt("data_criacao", fim6);

      const buckets: Record<
        string,
        { mes: string; sumP: number; sumR: number; w: number }
      > = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ano, mes - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        buckets[key] = { mes: MESES[d.getMonth()].slice(0, 3), sumP: 0, sumR: 0, w: 0 };
      }
      (hist ?? []).forEach((h: any) => {
        const d = new Date(h.data_criacao);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const b = buckets[key];
        if (!b) return;
        const v = h.valor_venda ?? 0;
        if (v <= 0) return;
        if (h.margem_prevista != null) b.sumP += h.margem_prevista * v;
        if (h.margem_realizada != null) b.sumR += h.margem_realizada * v;
        b.w += v;
      });
      setEvolucao(
        Object.values(buckets).map((b) => ({
          mes: b.mes,
          prevista: b.w > 0 ? +(b.sumP / b.w).toFixed(1) : null,
          realizada: b.w > 0 ? +(b.sumR / b.w).toFixed(1) : null,
        }))
      );

      setLoading(false);
    };
    load();
  }, [mes, ano, vendedor, statusFiltro]);

  const fmt = (n: number | null) =>
    (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const metrics = useMemo(() => {
    const faturamento = rows.reduce((s, r) => s + (r.valor_venda ?? 0), 0);
    const margens = rows
      .map((r) => r.margem_realizada)
      .filter((m): m is number => m !== null && m !== undefined);
    const melhor = margens.length ? Math.max(...margens) : null;
    const pior = margens.length ? Math.min(...margens) : null;
    // Médias ponderadas pelo valor de venda
    const weighted = (key: "margem_prevista" | "margem_realizada") => {
      let totalW = 0;
      let acc = 0;
      for (const r of rows) {
        const v = r.valor_venda ?? 0;
        const m = r[key];
        if (v > 0 && m !== null && m !== undefined) {
          acc += m * v;
          totalW += v;
        }
      }
      return totalW > 0 ? acc / totalW : null;
    };
    return {
      faturamento,
      media: weighted("margem_realizada"),
      mediaPrev: weighted("margem_prevista"),
      melhor,
      pior,
    };
  }, [rows]);

  const margemColor = (m: number | null) => {
    if (m === null) return "#6B7A90";
    if (m >= 25) return "#12B76A";
    if (m >= 15) return "#E8A020";
    return "#E53935";
  };
  const fmtPct = (m: number | null) => (m === null ? "—" : `${m.toFixed(1)}%`);

  // Comissão base estimada (não há tabela de regras configurada)
  const COMISSAO_BASE = 0.03;

  const ranking = useMemo(() => {
    const map = new Map<
      string,
      { id: string; nome: string; contratos: number; fat: number; sumM: number; w: number }
    >();
    for (const r of rows) {
      if (!r.vendedor_id) continue;
      const v = r.valor_venda ?? 0;
      const cur =
        map.get(r.vendedor_id) ??
        {
          id: r.vendedor_id,
          nome: vendedores.find((u) => u.id === r.vendedor_id)?.nome ?? "—",
          contratos: 0,
          fat: 0,
          sumM: 0,
          w: 0,
        };
      cur.contratos += 1;
      cur.fat += v;
      if (v > 0 && r.margem_realizada != null) {
        cur.sumM += r.margem_realizada * v;
        cur.w += v;
      }
      map.set(r.vendedor_id, cur);
    }
    const arr = Array.from(map.values()).map((v) => ({
      ...v,
      margem: v.w > 0 ? v.sumM / v.w : null,
      comissao: v.fat * COMISSAO_BASE,
    }));
    arr.sort((a, b) =>
      rankBy === "margem"
        ? (b.margem ?? -Infinity) - (a.margem ?? -Infinity)
        : b.fat - a.fat
    );
    return arr;
  }, [rows, vendedores, rankBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#0B1220]">NEXO DRE</h1>
          <p className="text-sm text-[#6B7A90]">Resultado por contrato</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={`${ano}-${mes}`}
            onValueChange={(v) => {
              const [a, m] = v.split("-").map(Number);
              setAno(a);
              setMes(m);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodos.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={vendedor} onValueChange={setVendedor}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="andamento">Em andamento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Faturamento total",
            value: fmt(metrics.faturamento),
            border: "#1E6FBF",
            valueColor: "#0B1220",
          },
          {
            label: "Margem média",
            value: fmtPct(metrics.media),
            border: margemColor(metrics.media),
            valueColor: margemColor(metrics.media),
          },
          {
            label: "Melhor margem",
            value: fmtPct(metrics.melhor),
            border: "#12B76A",
            valueColor: "#12B76A",
          },
          {
            label: "Pior margem",
            value: fmtPct(metrics.pior),
            border: "#E53935",
            valueColor: metrics.pior !== null ? "#E53935" : "#6B7A90",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-[#E8ECF2] bg-white p-4"
            style={{ borderTop: `3px solid ${c.border}` }}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7A90]">
              {c.label}
            </p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: c.valueColor }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E8ECF2] bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E8ECF2] bg-[#F5F7FA] text-left text-[#6B7A90]">
            <tr>
              <th className="px-4 py-3 font-medium">Nº</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Vendedor</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 text-right font-medium">Margem prevista</th>
              <th className="px-4 py-3 text-right font-medium">Margem realizada</th>
              <th className="px-4 py-3 text-right font-medium">Desvio</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-[#6B7A90]">
                  Carregando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <BarChart3 className="mx-auto mb-3 h-10 w-10 text-[#B0BAC9]" />
                  <p className="font-medium text-[#0B1220]">Nenhum contrato no período</p>
                  <p className="mt-1 text-sm text-[#6B7A90]">
                    Ajuste os filtros ou aguarde novos contratos
                  </p>
                </td>
              </tr>
            ) : (
              <>
                {rows.map((r) => {
                  const prev = r.margem_prevista ?? 0;
                  const real = r.margem_realizada ?? 0;
                  const desvio = real - prev;
                  const finalizado = r.status === "finalizado";
                  const vendedorNome =
                    vendedores.find((v) => v.id === r.vendedor_id)?.nome ?? "—";
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-[#E8ECF2] last:border-0 hover:bg-[#F8FAFC]"
                      style={{ backgroundColor: real < 15 ? "#FFF8F8" : undefined }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/contratos/${r.id}`}
                          className="text-[#1E6FBF] hover:underline"
                        >
                          #{r.id.slice(0, 4).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#0B1220]">{r.cliente_nome}</td>
                      <td className="px-4 py-3 text-[#6B7A90]">{vendedorNome}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.valor_venda)}</td>
                      <td
                        className="px-4 py-3 text-right font-medium"
                        style={{ color: margemColor(prev) }}
                      >
                        {prev.toFixed(1)}%
                      </td>
                      <td
                        className="px-4 py-3 text-right font-medium"
                        style={{ color: margemColor(real) }}
                      >
                        {real.toFixed(1)}%
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        style={{
                          color:
                            desvio > 0 ? "#12B76A" : desvio < 0 ? "#E53935" : "#B0BAC9",
                        }}
                      >
                        {desvio === 0
                          ? "—"
                          : `${desvio > 0 ? "▲ +" : "▼ "}${desvio
                              .toFixed(1)
                              .replace("-", "−")}pp`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: finalizado ? "#D1FAE5" : "#E6F3FF",
                            color: finalizado ? "#05873C" : "#1E6FBF",
                          }}
                        >
                          {finalizado ? "Finalizado" : "Em andamento"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/contratos/${r.id}?tab=dre`)}
                            className="rounded p-1.5 text-[#6B7A90] hover:bg-[#F5F7FA] hover:text-[#1E6FBF]"
                            title="Ver contrato"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => window.open(`/contratos/${r.id}?tab=dre&print=1`, "_blank")}
                            className="rounded p-1.5 text-[#6B7A90] hover:bg-[#F5F7FA] hover:text-[#1E6FBF]"
                            title="Exportar PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-[#E8ECF2] bg-[#F5F7FA] font-medium">
                  <td className="px-4 py-3 text-[#0B1220]">Total</td>
                  <td className="px-4 py-3 text-[#B0BAC9]">—</td>
                  <td className="px-4 py-3 text-[#B0BAC9]">—</td>
                  <td className="px-4 py-3 text-right text-[#0B1220]">
                    {fmt(metrics.faturamento)}
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    style={{ color: margemColor(metrics.mediaPrev) }}
                  >
                    {fmtPct(metrics.mediaPrev)}
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    style={{ color: margemColor(metrics.media) }}
                  >
                    {fmtPct(metrics.media)}
                  </td>
                  <td className="px-4 py-3 text-[#B0BAC9]">—</td>
                  <td className="px-4 py-3 text-[#B0BAC9]">—</td>
                  <td className="px-4 py-3 text-[#B0BAC9]">—</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-[#E8ECF2] bg-white p-5">
        <h2 className="mb-4 text-base font-medium text-[#0B1220]">
          Evolução da margem — últimos 6 meses
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={evolucao} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gPrev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E6FBF" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#1E6FBF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#12B76A" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#12B76A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E8ECF2" strokeWidth={0.5} vertical={false} />
              <XAxis
                dataKey="mes"
                stroke="#6B7A90"
                tickLine={false}
                axisLine={{ stroke: "#E8ECF2" }}
              />
              <YAxis
                domain={[0, 60]}
                tickFormatter={(v) => `${v}%`}
                stroke="#6B7A90"
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine
                y={30}
                stroke="#E8A020"
                strokeDasharray="4 4"
                label={{
                  value: "Meta mínima 30%",
                  position: "insideTopRight",
                  fill: "#E8A020",
                  fontSize: 11,
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const prev = payload.find((p) => p.dataKey === "prevista")?.value as
                    | number
                    | null;
                  const real = payload.find((p) => p.dataKey === "realizada")?.value as
                    | number
                    | null;
                  const desvio =
                    prev != null && real != null ? real - prev : null;
                  return (
                    <div className="rounded-md border border-[#E8ECF2] bg-white p-3 shadow-sm">
                      <p className="mb-1 text-xs font-medium text-[#6B7A90]">{label}</p>
                      <p className="text-sm" style={{ color: "#1E6FBF" }}>
                        Margem prevista: {prev != null ? `${prev}%` : "—"}
                      </p>
                      <p className="text-sm" style={{ color: "#12B76A" }}>
                        Margem realizada: {real != null ? `${real}%` : "—"}
                      </p>
                      {desvio != null && desvio < 0 && (
                        <p className="mt-1 text-xs" style={{ color: "#E53935" }}>
                          ▼ desvio de {Math.abs(desvio).toFixed(1)}pp
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="prevista"
                stroke="none"
                fill="url(#gPrev)"
              />
              <Area
                type="monotone"
                dataKey="realizada"
                stroke="none"
                fill="url(#gReal)"
              />
              <Line
                type="monotone"
                dataKey="prevista"
                stroke="#1E6FBF"
                strokeWidth={2}
                dot={{ r: 3, fill: "#1E6FBF" }}
              />
              <Line
                type="monotone"
                dataKey="realizada"
                stroke="#12B76A"
                strokeWidth={2}
                dot={{ r: 3, fill: "#12B76A" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs text-[#6B7A90]">
          <span className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5" style={{ background: "#1E6FBF" }} />
            Prevista
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5" style={{ background: "#12B76A" }} />
            Realizada
          </span>
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-5"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #E8A020 50%, transparent 0%)",
                backgroundSize: "6px 1px",
                backgroundRepeat: "repeat-x",
              }}
            />
            Meta mínima
          </span>
        </div>
      </div>

      {podeVerRanking && (
      <div className="rounded-lg border border-[#E8ECF2] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium text-[#0B1220]">Performance por vendedor</h2>
            <p className="text-sm text-[#6B7A90]">
              Quem vende com qualidade de margem, não só volume
            </p>
          </div>
          <div className="inline-flex rounded-md border border-[#E8ECF2] p-0.5 text-sm">
            {(["margem", "faturamento"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setRankBy(opt)}
                className="rounded px-3 py-1.5 transition-colors"
                style={{
                  background: rankBy === opt ? "#1E6FBF" : "transparent",
                  color: rankBy === opt ? "#fff" : "#6B7A90",
                }}
              >
                {opt === "margem" ? "Por margem" : "Por faturamento"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#E8ECF2]">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E8ECF2] bg-[#F5F7FA] text-left text-[#6B7A90]">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Vendedor</th>
                <th className="px-4 py-3 text-right font-medium">Contratos</th>
                <th className="px-4 py-3 text-right font-medium">Faturamento</th>
                <th className="px-4 py-3 text-right font-medium">Margem média</th>
                <th className="px-4 py-3 text-right font-medium">Comissão estimada</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#6B7A90]">
                    Nenhum dado de vendas no período
                  </td>
                </tr>
              ) : (
                ranking.map((v, i) => (
                  <tr
                    key={v.id}
                    className="border-b border-[#E8ECF2] last:border-0"
                    style={{ backgroundColor: i === 0 ? "#F0FDF9" : undefined }}
                  >
                    <td className="px-4 py-3 text-[#6B7A90]">{i + 1}</td>
                    <td className="px-4 py-3 text-[#0B1220]">
                      <span className="inline-flex items-center gap-2">
                        {v.nome}
                        {i === 0 && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{ background: "#D1FAE5", color: "#05873C" }}
                          >
                            Top
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#0B1220]">{v.contratos}</td>
                    <td className="px-4 py-3 text-right text-[#0B1220]">{fmt(v.fat)}</td>
                    <td
                      className="px-4 py-3 text-right font-medium"
                      style={{ color: margemColor(v.margem) }}
                    >
                      {fmtPct(v.margem)}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{ color: "#6B7A90", fontSize: "13px" }}
                    >
                      {fmt(v.comissao)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[#B0BAC9]">
          Comissão estimada calculada com base de {(COMISSAO_BASE * 100).toFixed(0)}% sobre o faturamento.
        </p>
      </div>
      )}
    </div>
  );
}

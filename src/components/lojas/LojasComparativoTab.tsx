import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtBRLk = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : fmtBRL(v));

function pctMetaColor(p: number) {
  if (p >= 100) return "#12B76A";
  if (p >= 70) return "#E8A020";
  return "#E53935";
}
function margemColor(m: number) {
  if (m >= 30) return "#12B76A";
  if (m >= 15) return "#E8A020";
  return "#E53935";
}
function npsColor(n: number | null) {
  if (n == null) return "#B0BAC9";
  if (n >= 8) return "#12B76A";
  if (n >= 6) return "#E8A020";
  return "#E53935";
}

function monthBounds(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { startISO: start.toISOString(), endISO: end.toISOString(), refDate: `${mes}-01` };
}

function titleFromMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface Props {
  mes: string;
}

interface LojaRow {
  id: string;
  nome: string;
  faturamento: number;
  meta_fat: number;
  pct_meta: number;
  margem: number;
  contratos: number;
  nps: number | null;
  pe_pct: number;
}

export function LojasComparativoTab({ mes }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["lojas-comparativo", mes],
    queryFn: async (): Promise<LojaRow[]> => {
      const { startISO, endISO, refDate } = monthBounds(mes);

      const [lojasRes, contratosRes, metasRes, peRes, npsRes] = await Promise.all([
        supabase.from("lojas").select("id, nome"),
        supabase
          .from("vw_contratos_dre")
          .select("loja_id, valor_venda, margem_realizada, data_criacao")
          .gte("data_criacao", startISO)
          .lt("data_criacao", endISO),
        supabase
          .from("metas_loja")
          .select("loja_id, meta_faturamento")
          .eq("mes_referencia", refDate),
        supabase.from("vw_ponto_equilibrio").select("loja_id, mes, faturamento_realizado, pe_calculado").eq("mes", refDate),
        supabase
          .from("chamados_pos_venda")
          .select("nps, contratos!inner(loja_id)")
          .gte("data_abertura", startISO)
          .lt("data_abertura", endISO)
          .not("nps", "is", null),
      ]);

      const lojas = lojasRes.data ?? [];
      const metaMap = new Map((metasRes.data ?? []).map((m: any) => [m.loja_id, Number(m.meta_faturamento) || 0]));
      const peMap = new Map(
        (peRes.data ?? []).map((p: any) => [
          p.loja_id,
          { fat: Number(p.faturamento_realizado) || 0, pe: Number(p.pe_calculado) || 0 },
        ]),
      );

      const aggCtr = new Map<string, { fat: number; margens: number[]; n: number }>();
      (contratosRes.data ?? []).forEach((c: any) => {
        const cur = aggCtr.get(c.loja_id) ?? { fat: 0, margens: [], n: 0 };
        cur.fat += Number(c.valor_venda) || 0;
        if (c.margem_realizada != null) cur.margens.push(Number(c.margem_realizada));
        cur.n += 1;
        aggCtr.set(c.loja_id, cur);
      });

      const npsAgg = new Map<string, { sum: number; n: number }>();
      (npsRes.data ?? []).forEach((r: any) => {
        const lojaId = r.contratos?.loja_id;
        if (!lojaId || r.nps == null) return;
        const cur = npsAgg.get(lojaId) ?? { sum: 0, n: 0 };
        cur.sum += Number(r.nps);
        cur.n += 1;
        npsAgg.set(lojaId, cur);
      });

      return lojas.map((l: any) => {
        const c = aggCtr.get(l.id) ?? { fat: 0, margens: [], n: 0 };
        const meta = metaMap.get(l.id) ?? 0;
        const pe = peMap.get(l.id);
        const peAtingido = pe && pe.pe > 0 ? (pe.fat / pe.pe) * 100 : 0;
        const margem = c.margens.length ? c.margens.reduce((a, b) => a + b, 0) / c.margens.length : 0;
        const nps = npsAgg.get(l.id);
        return {
          id: l.id,
          nome: l.nome,
          faturamento: c.fat,
          meta_fat: meta,
          pct_meta: meta > 0 ? (c.fat / meta) * 100 : 0,
          margem,
          contratos: c.n,
          nps: nps && nps.n > 0 ? nps.sum / nps.n : null,
          pe_pct: peAtingido,
        };
      });
    },
  });

  const sorted = useMemo(() => [...rows].sort((a, b) => b.faturamento - a.faturamento), [rows]);

  const bestId = sorted[0]?.id;
  const isCritico = (r: LojaRow) => r.pct_meta < 70 || r.margem < 15 || (r.nps != null && r.nps < 6);

  const chartData = sorted.map((r) => ({
    nome: r.nome,
    Faturamento: Math.round(r.faturamento),
    Meta: Math.round(r.meta_fat),
    pct: r.pct_meta,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>
        Comparativo entre lojas — {titleFromMes(mes)}
      </h2>

      {/* Tabela */}
      <div
        className="overflow-hidden"
        style={{ background: "#FFFFFF", border: "0.5px solid #E8ECF2", borderRadius: 12 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F5F7FA" }}>
                {["Loja", "Faturamento", "Meta fat", "% meta", "Margem média", "Contratos", "NPS", "PE atingido"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#6B7A90",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        borderBottom: "0.5px solid #E8ECF2",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{ fontSize: 13, color: "#6B7A90" }}>
                    Carregando...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{ fontSize: 13, color: "#6B7A90" }}>
                    Nenhuma loja cadastrada
                  </td>
                </tr>
              ) : (
                sorted.map((r) => {
                  const best = r.id === bestId;
                  const critico = !best && isCritico(r);
                  const bg = best ? "#F0FDF9" : critico ? "#FFF8F8" : "#FFFFFF";
                  const peFill = Math.min(100, Math.max(0, r.pe_pct));
                  return (
                    <tr key={r.id} style={{ borderBottom: "0.5px solid #E8ECF2", background: bg }}>
                      <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                        {r.nome}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 13, color: "#0D1117" }}>
                        {fmtBRL(r.faturamento)}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 13, color: "#6B7A90" }}>
                        {r.meta_fat > 0 ? fmtBRL(r.meta_fat) : "—"}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ fontSize: 13, fontWeight: 600, color: r.meta_fat > 0 ? pctMetaColor(r.pct_meta) : "#B0BAC9" }}
                      >
                        {r.meta_fat > 0 ? `${r.pct_meta.toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 600, color: margemColor(r.margem) }}>
                        {r.margem.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 13, color: "#0D1117" }}>
                        {r.contratos}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 600, color: npsColor(r.nps) }}>
                        {r.nps != null ? r.nps.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            style={{
                              width: 80,
                              height: 6,
                              borderRadius: 999,
                              background: "#E8ECF2",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${peFill}%`,
                                height: "100%",
                                background:
                                  r.pe_pct >= 100 ? "#12B76A" : r.pe_pct >= 70 ? "#1E6FBF" : "#E53935",
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: "#6B7A90" }}>{r.pe_pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <div
          style={{
            background: "#FFFFFF",
            border: "0.5px solid #E8ECF2",
            borderRadius: 12,
            padding: 16,
            height: 320,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 12, fill: "#6B7A90" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7A90" }} tickFormatter={(v) => fmtBRLk(Number(v))} />
              <Tooltip
                cursor={{ fill: "#F5F7FA" }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid #E8ECF2" }}
                formatter={(value: any, name: string) => [fmtBRL(Number(value)), name]}
                labelFormatter={(label, payload) => {
                  const p = payload?.[0]?.payload;
                  return p ? `${label} — ${p.pct.toFixed(0)}% da meta` : label;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Faturamento" fill="#1E6FBF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Meta" fill="#12B76A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

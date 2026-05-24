import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, MetricTile, EmptyState } from "./SectionCard";
import { Periodo, rangeFromPeriodo, fmtBRL, fmtBRLAbrev, fmtPct, monthKey, monthLabel, monthsBetween } from "./shared";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";

const STATUS_COR_REC = { pendente: "#E8A020", pago: "#12B76A", atrasado: "#E53935" };
const STATUS_COR_PAG = { pendente: "#E8A020", pago: "#1E6FBF", atrasado: "#E53935" };

export function FinanceiroSection({ periodo, lojaId }: { periodo: Periodo; lojaId: string }) {
  const { start, end } = rangeFromPeriodo(periodo);
  const hoje = new Date().toISOString().slice(0, 10);
  const sIso = start.toISOString().slice(0, 10);
  const eIso = end.toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-financeiro", periodo, lojaId],
    queryFn: async () => {
      let recPagasQ = supabase
        .from("financeiro_contas_receber")
        .select("valor, data_pagamento")
        .eq("status", "pago")
        .gte("data_pagamento", sIso)
        .lt("data_pagamento", eIso);
      let pagPagasQ = supabase
        .from("financeiro_contas_pagar")
        .select("valor, data_pagamento, categoria")
        .eq("status", "pago")
        .gte("data_pagamento", sIso)
        .lt("data_pagamento", eIso);
      let recAllQ = supabase
        .from("financeiro_contas_receber")
        .select("valor, status, vencimento")
        .neq("status", "cancelado");
      let pagAllQ = supabase
        .from("financeiro_contas_pagar")
        .select("valor, status, vencimento, categoria")
        .neq("status", "cancelado");

      if (lojaId !== "all") {
        recPagasQ = recPagasQ.eq("loja_id", lojaId);
        pagPagasQ = pagPagasQ.eq("loja_id", lojaId);
        recAllQ = recAllQ.eq("loja_id", lojaId);
        pagAllQ = pagAllQ.eq("loja_id", lojaId);
      }

      const [recPagas, pagPagas, recAll, pagAll] = await Promise.all([
        recPagasQ, pagPagasQ, recAllQ, pagAllQ,
      ]);

      const meses = monthsBetween(start, end);
      const porMes = Object.fromEntries(meses.map((m) => [m, { entradas: 0, saidas: 0 }]));
      (recPagas.data ?? []).forEach((r) => {
        if (!r.data_pagamento) return;
        const k = monthKey(new Date(r.data_pagamento));
        if (porMes[k]) porMes[k].entradas += Number(r.valor || 0);
      });
      (pagPagas.data ?? []).forEach((r) => {
        if (!r.data_pagamento) return;
        const k = monthKey(new Date(r.data_pagamento));
        if (porMes[k]) porMes[k].saidas += Number(r.valor || 0);
      });
      const serie = meses.map((m) => ({
        mes: monthLabel(m),
        entradas: porMes[m].entradas,
        saidas: porMes[m].saidas,
      }));

      const totalEntradas = serie.reduce((s, x) => s + x.entradas, 0);
      const totalSaidas = serie.reduce((s, x) => s + x.saidas, 0);
      const comissoesPagas = (pagPagas.data ?? [])
        .filter((p) => (p.categoria ?? "").toLowerCase().includes("comiss"))
        .reduce((s, p) => s + Number(p.valor || 0), 0);

      // Status receber/pagar (em aberto)
      const recAtrasado = (recAll.data ?? [])
        .filter((r) => r.status === "pendente" && r.vencimento && r.vencimento < hoje)
        .reduce((s, r) => s + Number(r.valor || 0), 0);
      const recPendente = (recAll.data ?? [])
        .filter((r) => r.status === "pendente" && (!r.vencimento || r.vencimento >= hoje))
        .reduce((s, r) => s + Number(r.valor || 0), 0);
      const recPagoTotal = (recAll.data ?? [])
        .filter((r) => r.status === "pago")
        .reduce((s, r) => s + Number(r.valor || 0), 0);
      const totalRecAberto = recAtrasado + recPendente;
      const inadimplenciaPct = totalRecAberto > 0 ? (recAtrasado / totalRecAberto) * 100 : 0;

      const recStatus = [
        { status: "Em dia", valor: recPendente, cor: STATUS_COR_REC.pendente },
        { status: "Atrasado", valor: recAtrasado, cor: STATUS_COR_REC.atrasado },
        { status: "Pago", valor: recPagoTotal, cor: STATUS_COR_REC.pago },
      ].filter((s) => s.valor > 0);

      const pagAtrasado = (pagAll.data ?? [])
        .filter((r) => r.status === "pendente" && r.vencimento && r.vencimento < hoje)
        .reduce((s, r) => s + Number(r.valor || 0), 0);
      const pagPendente = (pagAll.data ?? [])
        .filter((r) => r.status === "pendente" && (!r.vencimento || r.vencimento >= hoje))
        .reduce((s, r) => s + Number(r.valor || 0), 0);
      const pagPagoTotal = (pagAll.data ?? [])
        .filter((r) => r.status === "pago")
        .reduce((s, r) => s + Number(r.valor || 0), 0);
      const pagStatus = [
        { status: "Em dia", valor: pagPendente, cor: STATUS_COR_PAG.pendente },
        { status: "Atrasado", valor: pagAtrasado, cor: STATUS_COR_PAG.atrasado },
        { status: "Pago", valor: pagPagoTotal, cor: STATUS_COR_PAG.pago },
      ].filter((s) => s.valor > 0);

      // Despesas por categoria (pagas no período)
      const catMap = new Map<string, number>();
      (pagPagas.data ?? []).forEach((p) => {
        const c = p.categoria || "Sem categoria";
        catMap.set(c, (catMap.get(c) ?? 0) + Number(p.valor || 0));
      });
      const despesasCat = Array.from(catMap.entries())
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 8);

      return {
        serie,
        totalEntradas,
        totalSaidas,
        comissoesPagas,
        recAtrasado,
        inadimplenciaPct,
        recStatus,
        pagStatus,
        despesasCat,
      };
    },
  });

  const d = data;
  const skel = isLoading || !d;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Entradas no período" value={skel ? "—" : fmtBRL(d!.totalEntradas)} accent="#12B76A" icon={<TrendingUp className="h-4 w-4" />} />
        <MetricTile label="Saídas no período" value={skel ? "—" : fmtBRL(d!.totalSaidas)} accent="#E53935" icon={<TrendingDown className="h-4 w-4" />} />
        <MetricTile label="Comissões pagas" value={skel ? "—" : fmtBRL(d!.comissoesPagas)} accent="#534AB7" />
        <MetricTile label="Inadimplência" value={skel ? "—" : fmtPct(d!.inadimplenciaPct, 1)} hint={skel ? "" : `${fmtBRL(d!.recAtrasado)} atrasado`} accent="#E53935" icon={<AlertCircle className="h-4 w-4" />} />
      </div>

      <SectionCard title="Entradas vs saídas por mês" description="Realizado (regime de caixa)">
        {skel ? (
          <div style={{ height: 240 }} className="animate-pulse rounded bg-slate-100" />
        ) : d!.serie.every((s) => s.entradas === 0 && s.saidas === 0) ? (
          <EmptyState message="Sem movimentação financeira no período." />
        ) : (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={d!.serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#EEF1F5" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtBRLAbrev} tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entradas" name="Entradas" fill="#12B76A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="#E53935" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Contas a receber por status">
          {skel || d!.recStatus.length === 0 ? (
            <EmptyState message="Sem contas a receber." />
          ) : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={d!.recStatus} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF1F5" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtBRLAbrev} tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {d!.recStatus.map((s, i) => <Cell key={i} fill={s.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Contas a pagar por status">
          {skel || d!.pagStatus.length === 0 ? (
            <EmptyState message="Sem contas a pagar." />
          ) : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={d!.pagStatus} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF1F5" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtBRLAbrev} tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {d!.pagStatus.map((s, i) => <Cell key={i} fill={s.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Despesas por categoria" description="Pagas no período (top 8)">
        {skel ? (
          <div style={{ height: 200 }} className="animate-pulse rounded bg-slate-100" />
        ) : d!.despesasCat.length === 0 ? (
          <EmptyState message="Sem despesas pagas no período." />
        ) : (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={d!.despesasCat} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#EEF1F5" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtBRLAbrev} tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="categoria" tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} width={140} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="valor" fill="#E53935" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

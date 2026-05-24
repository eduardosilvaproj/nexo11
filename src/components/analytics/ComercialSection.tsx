import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, EmptyState } from "./SectionCard";
import { Periodo, rangeFromPeriodo, fmtBRL, fmtBRLAbrev, monthKey, monthLabel, monthsBetween } from "./shared";

const STATUS_LABEL: Record<string, string> = {
  comercial: "Comercial",
  tecnico: "Técnico",
  producao: "Produção",
  logistica: "Logística",
  montagem: "Montagem",
  pos_venda: "Pós-venda",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};
const STATUS_COR: Record<string, string> = {
  comercial: "#1E6FBF",
  tecnico: "#534AB7",
  producao: "#D85A30",
  logistica: "#12B76A",
  montagem: "#1D9E75",
  pos_venda: "#E8A020",
  finalizado: "#05873C",
  cancelado: "#B0BAC9",
};

export function ComercialSection({ periodo, lojaId }: { periodo: Periodo; lojaId: string }) {
  const { start, end } = rangeFromPeriodo(periodo);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-comercial", periodo, lojaId],
    queryFn: async () => {
      let cQ = supabase
        .from("contratos")
        .select("id, valor_venda, status, data_criacao, vendedor_id, loja_id")
        .gte("data_criacao", start.toISOString())
        .lt("data_criacao", end.toISOString());
      if (lojaId !== "all") cQ = cQ.eq("loja_id", lojaId);

      let recQ = supabase
        .from("financeiro_contas_receber")
        .select("valor, data_pagamento")
        .eq("status", "pago")
        .gte("data_pagamento", start.toISOString().slice(0, 10))
        .lt("data_pagamento", end.toISOString().slice(0, 10));
      if (lojaId !== "all") recQ = recQ.eq("loja_id", lojaId);

      const [contratos, receb] = await Promise.all([cQ, recQ]);
      const arr = (contratos.data ?? []).filter((c) => c.status !== "cancelado");

      const meses = monthsBetween(start, end);
      const porMes = Object.fromEntries(meses.map((m) => [m, { contratado: 0, recebido: 0 }]));
      arr.forEach((c) => {
        if (!c.data_criacao) return;
        const k = monthKey(new Date(c.data_criacao));
        if (porMes[k]) porMes[k].contratado += Number(c.valor_venda || 0);
      });
      (receb.data ?? []).forEach((r) => {
        if (!r.data_pagamento) return;
        const k = monthKey(new Date(r.data_pagamento));
        if (porMes[k]) porMes[k].recebido += Number(r.valor || 0);
      });
      const serieMensal = meses.map((m) => ({
        mes: monthLabel(m),
        contratado: porMes[m].contratado,
        recebido: porMes[m].recebido,
      }));

      const porStatus: Record<string, number> = {};
      arr.forEach((c) => {
        porStatus[c.status] = (porStatus[c.status] ?? 0) + 1;
      });
      const statusArr = Object.entries(porStatus).map(([k, v]) => ({
        status: STATUS_LABEL[k] ?? k,
        valor: v,
        cor: STATUS_COR[k] ?? "#6B7A90",
      }));

      // Ranking vendedores
      const vendMap = new Map<string, { contratos: number; valor: number }>();
      arr.forEach((c) => {
        const k = c.vendedor_id ?? "__sem__";
        if (!vendMap.has(k)) vendMap.set(k, { contratos: 0, valor: 0 });
        const x = vendMap.get(k)!;
        x.contratos += 1;
        x.valor += Number(c.valor_venda || 0);
      });
      const ids = Array.from(vendMap.keys()).filter((k) => k !== "__sem__");
      const nomes = new Map<string, string>();
      if (ids.length) {
        const { data: users } = await supabase
          .from("usuarios_publico")
          .select("id, nome")
          .in("id", ids);
        (users ?? []).forEach((u: any) => nomes.set(u.id, u.nome ?? "—"));
      }
      const ranking = Array.from(vendMap.entries())
        .map(([id, v]) => ({
          id,
          nome: id === "__sem__" ? "Sem vendedor vinculado" : nomes.get(id) ?? "—",
          contratos: v.contratos,
          valor: v.valor,
        }))
        .sort((a, b) => b.valor - a.valor);

      return { serieMensal, statusArr, ranking };
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Faturamento contratado vs recebido" description="Comparativo mensal">
          {isLoading || !data ? (
            <div style={{ height: 240 }} className="animate-pulse rounded bg-slate-100" />
          ) : data.serieMensal.every((s) => s.contratado === 0 && s.recebido === 0) ? (
            <EmptyState message="Sem movimentação no período selecionado." />
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={data.serieMensal} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF1F5" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtBRLAbrev} tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="contratado" name="Contratado" fill="#1E6FBF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recebido" name="Recebido" fill="#12B76A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Contratos por status" description="Distribuição no período">
          {isLoading || !data ? (
            <div style={{ height: 240 }} className="animate-pulse rounded bg-slate-100" />
          ) : data.statusArr.length === 0 ? (
            <EmptyState message="Sem contratos no período." />
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={data.statusArr} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF1F5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {data.statusArr.map((d, i) => (
                      <Cell key={i} fill={d.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Ranking de vendedores" description="Por valor contratado no período">
        {isLoading || !data ? (
          <div style={{ height: 160 }} className="animate-pulse rounded bg-slate-100" />
        ) : data.ranking.length === 0 ? (
          <EmptyState message="Sem vendas registradas no período." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#6B7A90", fontSize: 11, textTransform: "uppercase" }}>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Vendedor</th>
                  <th className="px-3 py-2 text-right font-medium">Contratos</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.ranking.map((r, i) => (
                  <tr key={r.id} style={{ borderTop: "1px solid #EEF1F5" }}>
                    <td className="px-3 py-2 text-[#6B7A90] font-medium">{i + 1}</td>
                    <td className="px-3 py-2 text-[#0D1117]">{r.nome}</td>
                    <td className="px-3 py-2 text-right text-[#0D1117]">{r.contratos}</td>
                    <td className="px-3 py-2 text-right font-medium text-[#0D1117]">{fmtBRL(r.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard, MetricTile, EmptyState } from "./SectionCard";
import { Periodo, rangeFromPeriodo, fmtBRL, fmtBRLAbrev } from "./shared";
import { Package, AlertTriangle, ShoppingCart } from "lucide-react";

export function EstoqueSection({ periodo, lojaId }: { periodo: Periodo; lojaId: string }) {
  const { start, end } = rangeFromPeriodo(periodo);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-estoque", periodo, lojaId],
    queryFn: async () => {
      let itensQ = supabase
        .from("estoque_itens")
        .select("id, descricao, categoria, quantidade_total, quantidade_reservada, estoque_minimo, custo_medio_unitario, ativo")
        .eq("ativo", true);
      let reqQ = supabase
        .from("requisicoes_compra")
        .select("id, status, valor_total");
      let movQ = supabase
        .from("estoque_movimentacoes")
        .select("tipo")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());
      if (lojaId !== "all") {
        itensQ = itensQ.eq("loja_id", lojaId);
        reqQ = reqQ.eq("loja_id", lojaId);
        movQ = movQ.eq("loja_id", lojaId);
      }
      const [itens, reqs, movs] = await Promise.all([itensQ, reqQ, movQ]);
      const itensArr = itens.data ?? [];

      const valorEstoque = itensArr.reduce(
        (s, i) => s + Number(i.quantidade_total || 0) * Number(i.custo_medio_unitario || 0),
        0,
      );
      const baixoEstoque = itensArr.filter(
        (i) => Number(i.quantidade_total || 0) > 0 && Number(i.quantidade_total || 0) <= Number(i.estoque_minimo || 0),
      ).length;
      const semEstoque = itensArr.filter((i) => Number(i.quantidade_total || 0) <= 0).length;
      const totalReservado = itensArr.reduce((s, i) => s + Number(i.quantidade_reservada || 0), 0);

      const reqsArr = reqs.data ?? [];
      const reqsPendentes = reqsArr.filter((r) => r.status === "pendente" || r.status === "aprovada").length;

      const movsArr = movs.data ?? [];
      const entradas = movsArr.filter((m: any) => m.tipo === "entrada" || m.tipo === "devolucao").length;
      const saidas = movsArr.filter((m: any) => m.tipo === "saida" || m.tipo === "baixa").length;

      const porCategoria = new Map<string, number>();
      itensArr.forEach((i) => {
        const c = i.categoria || "Sem categoria";
        porCategoria.set(c, (porCategoria.get(c) ?? 0) + Number(i.quantidade_total || 0) * Number(i.custo_medio_unitario || 0));
      });
      const categorias = Array.from(porCategoria.entries())
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 6);

      const criticos = itensArr
        .filter((i) => Number(i.quantidade_total || 0) <= Number(i.estoque_minimo || 0))
        .map((i) => ({
          id: i.id,
          descricao: i.descricao,
          quantidade: Number(i.quantidade_total || 0),
          minimo: Number(i.estoque_minimo || 0),
        }))
        .sort((a, b) => a.quantidade - b.quantidade)
        .slice(0, 8);

      return {
        valorEstoque,
        baixoEstoque,
        semEstoque,
        totalReservado,
        reqsPendentes,
        entradas,
        saidas,
        categorias,
        criticos,
      };
    },
  });

  const d = data;
  const skel = isLoading || !d;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Valor em estoque" value={skel ? "—" : fmtBRL(d!.valorEstoque)} accent="#1E6FBF" icon={<Package className="h-4 w-4" />} />
        <MetricTile label="Requisições pendentes" value={skel ? "—" : String(d!.reqsPendentes)} accent="#E8A020" icon={<ShoppingCart className="h-4 w-4" />} />
        <MetricTile label="Itens com estoque baixo" value={skel ? "—" : String(d!.baixoEstoque)} accent="#E8A020" icon={<AlertTriangle className="h-4 w-4" />} />
        <MetricTile label="Itens sem estoque" value={skel ? "—" : String(d!.semEstoque)} accent="#E53935" />
        <MetricTile label="Itens reservados" value={skel ? "—" : String(d!.totalReservado)} accent="#534AB7" />
        <MetricTile label="Entradas no período" value={skel ? "—" : String(d!.entradas)} accent="#12B76A" />
        <MetricTile label="Saídas no período" value={skel ? "—" : String(d!.saidas)} accent="#D85A30" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Estoque valorizado por categoria">
          {skel ? (
            <div style={{ height: 220 }} className="animate-pulse rounded bg-slate-100" />
          ) : d!.categorias.length === 0 ? (
            <EmptyState message="Sem itens em estoque." />
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={d!.categorias} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF1F5" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtBRLAbrev} tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="categoria" tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Bar dataKey="valor" fill="#1E6FBF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Itens críticos" description="Estoque abaixo do mínimo">
          {skel ? (
            <div style={{ height: 220 }} className="animate-pulse rounded bg-slate-100" />
          ) : d!.criticos.length === 0 ? (
            <EmptyState message="Nenhum item crítico. ✓" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "#6B7A90", fontSize: 11, textTransform: "uppercase" }}>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Atual</th>
                    <th className="px-3 py-2 text-right font-medium">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {d!.criticos.map((i) => (
                    <tr key={i.id} style={{ borderTop: "1px solid #EEF1F5" }}>
                      <td className="px-3 py-2 text-[#0D1117]">{i.descricao}</td>
                      <td className="px-3 py-2 text-right font-medium" style={{ color: i.quantidade <= 0 ? "#E53935" : "#E8A020" }}>
                        {i.quantidade}
                      </td>
                      <td className="px-3 py-2 text-right text-[#6B7A90]">{i.minimo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

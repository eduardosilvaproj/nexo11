import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Dre() {
  const today = new Date();
  const [mes, setMes] = useState<number>(today.getMonth());
  const [ano, setAno] = useState<number>(today.getFullYear());
  const [vendedor, setVendedor] = useState<string>("all");
  const [statusFiltro, setStatusFiltro] = useState<string>("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
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
          "id, cliente_nome, status, vendedor_id, data_criacao, valor_venda, margem_prevista, margem_realizada, desvio_total"
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
    const media = margens.length ? margens.reduce((a, b) => a + b, 0) / margens.length : null;
    const melhor = margens.length ? Math.max(...margens) : null;
    const pior = margens.length ? Math.min(...margens) : null;
    return { faturamento, media, melhor, pior };
  }, [rows]);

  const margemColor = (m: number | null) => {
    if (m === null) return "#6B7A90";
    if (m >= 25) return "#12B76A";
    if (m >= 15) return "#E8A020";
    return "#E53935";
  };
  const fmtPct = (m: number | null) => (m === null ? "—" : `${m.toFixed(1)}%`);

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

      <div className="rounded-lg border border-[#E8ECF2] bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E8ECF2] bg-[#F5F7FA] text-left text-[#6B7A90]">
            <tr>
              <th className="px-4 py-3 font-medium">Contrato</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Venda</th>
              <th className="px-4 py-3 text-right font-medium">Margem prev.</th>
              <th className="px-4 py-3 text-right font-medium">Margem real.</th>
              <th className="px-4 py-3 text-right font-medium">Desvio</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#6B7A90]">
                  Carregando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#6B7A90]">
                  Nenhum contrato no período
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-[#E8ECF2] last:border-0 hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <Link to={`/contratos/${r.id}`} className="text-[#1E6FBF] hover:underline">
                      #{r.id.slice(0, 4).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#0B1220]">{r.cliente_nome}</td>
                  <td className="px-4 py-3 capitalize text-[#6B7A90]">{r.status}</td>
                  <td className="px-4 py-3 text-right">{fmt(r.valor_venda)}</td>
                  <td className="px-4 py-3 text-right">{(r.margem_prevista ?? 0).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">{(r.margem_realizada ?? 0).toFixed(1)}%</td>
                  <td
                    className="px-4 py-3 text-right"
                    style={{ color: (r.desvio_total ?? 0) > 0 ? "#E53935" : "#12B76A" }}
                  >
                    {fmt(r.desvio_total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

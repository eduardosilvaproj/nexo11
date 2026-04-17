import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ContratoDreTabProps {
  contratoId: string;
  contratoNumero?: string;
  contratoStatus?: string;
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const marginColor = (m: number) => {
  if (m >= 30) return "#12B76A";
  if (m >= 15) return "#E8A020";
  return "#E53935";
};

export function ContratoDreTab({ contratoId, contratoNumero, contratoStatus }: ContratoDreTabProps) {
  const { data: dre } = useQuery({
    queryKey: ["dre-tab", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dre_contrato")
        .select("*")
        .eq("contrato_id", contratoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contratoId,
  });

  const { data: retrabalhos } = useQuery({
    queryKey: ["dre-retrabalhos", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retrabalhos")
        .select("custo, resolvido")
        .eq("contrato_id", contratoId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contratoId,
  });

  const { data: chamados } = useQuery({
    queryKey: ["dre-chamados", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados_pos_venda")
        .select("custo, status")
        .eq("contrato_id", contratoId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contratoId,
  });

  const valorVenda = Number(dre?.valor_venda ?? 0);

  // Retrabalho: previsto = soma de todos custos; real = soma dos resolvidos
  const retrabalhoPrev = (retrabalhos ?? []).reduce((s, r) => s + Number(r.custo || 0), 0);
  const retrabalhoReal = (retrabalhos ?? [])
    .filter((r) => r.resolvido)
    .reduce((s, r) => s + Number(r.custo || 0), 0);

  // Assistência: previsto = soma de todos chamados; real = soma dos resolvidos
  const assistenciaPrev = (chamados ?? []).reduce((s, c) => s + Number(c.custo || 0), 0);
  const assistenciaReal = (chamados ?? [])
    .filter((c) => c.status === "resolvido")
    .reduce((s, c) => s + Number(c.custo || 0), 0);

  // outros_custos do DRE inclui retrabalho+assistência. "Outros" puro = total − (retrabalho+assistência).
  const outrosTotalPrev = Number(dre?.outros_custos_previstos ?? 0);
  const outrosTotalReal = Number(dre?.outros_custos_reais ?? 0);
  const outrosPrev = Math.max(0, outrosTotalPrev - retrabalhoPrev - assistenciaPrev);
  const outrosReal = Math.max(0, outrosTotalReal - retrabalhoReal - assistenciaReal);

  const linhasCusto = [
    {
      label: "Produto",
      previsto: Number(dre?.custo_produto_previsto ?? 0),
      real: Number(dre?.custo_produto_real ?? 0),
    },
    {
      label: "Montagem",
      previsto: Number(dre?.custo_montagem_previsto ?? 0),
      real: Number(dre?.custo_montagem_real ?? 0),
    },
    {
      label: "Frete",
      previsto: Number(dre?.custo_frete_previsto ?? 0),
      real: Number(dre?.custo_frete_real ?? 0),
    },
    {
      label: "Comissão",
      previsto: Number(dre?.custo_comissao_previsto ?? 0),
      real: Number(dre?.custo_comissao_real ?? 0),
    },
    { label: "Retrabalho", previsto: retrabalhoPrev, real: retrabalhoReal },
    { label: "Assistência", previsto: assistenciaPrev, real: assistenciaReal },
    { label: "Outros", previsto: outrosPrev, real: outrosReal },
  ];

  const totalCustoPrev = linhasCusto.reduce((s, l) => s + l.previsto, 0);
  const totalCustoReal = linhasCusto.reduce((s, l) => s + l.real, 0);
  const lucroPrev = valorVenda - totalCustoPrev;
  const lucroReal = valorVenda - totalCustoReal;
  const margemPrev = valorVenda > 0 ? (lucroPrev / valorVenda) * 100 : 0;
  const margemReal = valorVenda > 0 ? (lucroReal / valorVenda) * 100 : 0;
  const desvioMargem = margemReal - margemPrev;

  const chartData = linhasCusto
    .filter((l) => l.label !== "Assistência") // gráfico mantém 6 categorias do briefing
    .map((l) => ({ categoria: l.label, Previsto: l.previsto, Realizado: l.real }));

  const isFechado = contratoStatus === "finalizado";

  // Itens com maior desvio (real > previsto)
  const desvios = linhasCusto
    .map((l) => ({ ...l, desvio: l.real - l.previsto }))
    .filter((l) => l.desvio > 0)
    .sort((a, b) => b.desvio - a.desvio);

  const showAlertaMargem = desvioMargem < -2;

  // ---------- estilos ----------
  const headerCell: React.CSSProperties = {
    padding: "10px 16px",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#6B7A90",
    fontWeight: 500,
    backgroundColor: "#F5F7FA",
    textAlign: "left",
    borderBottom: "0.5px solid #E8ECF2",
  };
  const headerNum: React.CSSProperties = { ...headerCell, textAlign: "right" };

  const cellBase: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: 13,
    color: "#0D1117",
    borderBottom: "0.5px solid #E8ECF2",
  };
  const cellNum: React.CSSProperties = {
    ...cellBase,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  };
  const totalCell: React.CSSProperties = {
    ...cellBase,
    backgroundColor: "#F5F7FA",
    fontWeight: 500,
  };
  const totalNum: React.CSSProperties = {
    ...cellNum,
    backgroundColor: "#F5F7FA",
    fontWeight: 500,
  };

  const renderDesvio = (previsto: number, real: number, isPercent = false, suffix = "") => {
    const d = real - previsto;
    if (Math.abs(d) < 0.005) return <span style={{ color: "#6B7A90" }}>—</span>;
    const positivo = d > 0; // custo maior que previsto = ruim
    const color = positivo ? "#E53935" : "#12B76A";
    const arrow = positivo ? "▲" : "▼";
    const valueStr = isPercent
      ? `${Math.abs(d).toFixed(1).replace(".", ",")}${suffix}`
      : formatBRL(Math.abs(d));
    return (
      <span style={{ color, fontWeight: 500 }}>
        {arrow} {valueStr}
      </span>
    );
  };

  const renderDesvioLucro = (previsto: number, real: number) => {
    const d = real - previsto;
    if (Math.abs(d) < 0.005) return <span style={{ color: "#6B7A90" }}>—</span>;
    const positivo = d > 0; // lucro maior = bom
    const color = positivo ? "#12B76A" : "#E53935";
    const arrow = positivo ? "▲" : "▼";
    return (
      <span style={{ color, fontWeight: 500 }}>
        {arrow} {formatBRL(Math.abs(d))}
      </span>
    );
  };

  const dataEmissao = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date());
  const numeroFmt = contratoNumero ? `#${contratoNumero}` : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#0D1117" }}>
          DRE do contrato {numeroFmt}
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              color: "#1E6FBF",
              backgroundColor: "#FFFFFF",
              border: "1px solid #1E6FBF",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Exportar PDF
          </button>
          <span
            className="inline-flex items-center"
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 500,
              backgroundColor: isFechado ? "#E6F4EA" : "#FEF3C7",
              color: isFechado ? "#12B76A" : "#E8A020",
            }}
          >
            {isFechado ? "Fechado" : "Em andamento"}
          </span>
        </div>
      </div>

      {/* Área impressa (visível somente em @media print) */}
      <div className="dre-print">
        <div style={{ borderBottom: "2px solid #0D1117", paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.04em", color: "#0D1117" }}>
            NEXO
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8, color: "#0D1117" }}>
            DRE — Contrato {numeroFmt}
          </div>
          <div style={{ fontSize: 11, color: "#6B7A90", marginTop: 4 }}>
            Data de emissão: {dataEmissao}
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "#0D1117" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #0D1117" }}>Item</th>
              <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #0D1117" }}>Previsto</th>
              <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #0D1117" }}>Real</th>
              <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #0D1117" }}>Desvio</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ padding: "5px 8px" }}>Receita líquida</td>
              <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatBRL(valorVenda)}</td>
              <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatBRL(valorVenda)}</td>
              <td style={{ padding: "5px 8px", textAlign: "right" }}>—</td>
            </tr>
            {linhasCusto.map((l) => {
              const d = l.real - l.previsto;
              return (
                <tr key={l.label}>
                  <td style={{ padding: "5px 8px" }}>{l.label}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatBRL(l.previsto)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatBRL(l.real)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>
                    {Math.abs(d) < 0.005 ? "—" : `${d > 0 ? "+" : "−"}${formatBRL(Math.abs(d))}`}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: "1px solid #0D1117", fontWeight: 600 }}>
              <td style={{ padding: "6px 8px" }}>TOTAL CUSTOS</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{formatBRL(totalCustoPrev)}</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{formatBRL(totalCustoReal)}</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>
                {`${totalCustoReal - totalCustoPrev >= 0 ? "+" : "−"}${formatBRL(Math.abs(totalCustoReal - totalCustoPrev))}`}
              </td>
            </tr>
            <tr style={{ fontWeight: 600 }}>
              <td style={{ padding: "6px 8px" }}>LUCRO</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{formatBRL(lucroPrev)}</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{formatBRL(lucroReal)}</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>
                {`${lucroReal - lucroPrev >= 0 ? "+" : "−"}${formatBRL(Math.abs(lucroReal - lucroPrev))}`}
              </td>
            </tr>
            <tr style={{ fontWeight: 600 }}>
              <td style={{ padding: "6px 8px" }}>MARGEM</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{margemPrev.toFixed(1).replace(".", ",")}%</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{margemReal.toFixed(1).replace(".", ",")}%</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>
                {`${desvioMargem >= 0 ? "+" : ""}${desvioMargem.toFixed(1).replace(".", ",")}pp`}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 32, paddingTop: 12, borderTop: "1px solid #6B7A90", fontSize: 10, color: "#6B7A90", textAlign: "center" }}>
          NEXO ERP · Gestão de Planejados
        </div>
      </div>

      {/* Alerta margem */}
      {showAlertaMargem && (
        <div
          style={{
            backgroundColor: "#FDECEA",
            border: "1px solid #E53935",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E53935", marginBottom: 8 }}>
            Onde a margem foi perdida
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "#0D1117" }}>
            {desvios.slice(0, 5).map((d, i) => (
              <li key={d.label} style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 500 }}>{d.label}:</span> +{formatBRL(d.desvio)} acima do
                previsto
                {i === 0 ? " (maior desvio)" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabela DRE */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "0.5px solid #E8ECF2",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={headerCell}>Item</th>
              <th style={headerNum}>Previsto</th>
              <th style={headerNum}>Real</th>
              <th style={headerNum}>Desvio</th>
            </tr>
          </thead>
          <tbody>
            {/* Receita */}
            <tr>
              <td style={cellBase}>Receita bruta</td>
              <td style={cellNum}>{formatBRL(valorVenda)}</td>
              <td style={cellNum}>{formatBRL(valorVenda)}</td>
              <td style={cellNum}>—</td>
            </tr>
            <tr>
              <td style={cellBase}>Desconto</td>
              <td style={cellNum}>{formatBRL(0)}</td>
              <td style={cellNum}>{formatBRL(0)}</td>
              <td style={cellNum}>—</td>
            </tr>
            <tr>
              <td style={totalCell}>Receita líquida</td>
              <td style={totalNum}>{formatBRL(valorVenda)}</td>
              <td style={totalNum}>{formatBRL(valorVenda)}</td>
              <td style={totalNum}>—</td>
            </tr>

            {/* Custos */}
            {linhasCusto.map((l) => (
              <tr key={l.label}>
                <td style={cellBase}>{l.label}</td>
                <td style={cellNum}>{formatBRL(l.previsto)}</td>
                <td style={cellNum}>{formatBRL(l.real)}</td>
                <td style={cellNum}>{renderDesvio(l.previsto, l.real)}</td>
              </tr>
            ))}

            {/* Totais */}
            <tr>
              <td style={totalCell}>TOTAL CUSTOS</td>
              <td style={totalNum}>{formatBRL(totalCustoPrev)}</td>
              <td style={totalNum}>{formatBRL(totalCustoReal)}</td>
              <td style={totalNum}>{renderDesvio(totalCustoPrev, totalCustoReal)}</td>
            </tr>
            <tr>
              <td style={totalCell}>LUCRO</td>
              <td style={totalNum}>{formatBRL(lucroPrev)}</td>
              <td style={totalNum}>{formatBRL(lucroReal)}</td>
              <td style={totalNum}>{renderDesvioLucro(lucroPrev, lucroReal)}</td>
            </tr>
            <tr>
              <td style={totalCell}>MARGEM</td>
              <td style={{ ...totalNum, color: marginColor(margemPrev) }}>
                {margemPrev.toFixed(1).replace(".", ",")}%
              </td>
              <td style={{ ...totalNum, color: marginColor(margemReal) }}>
                {margemReal.toFixed(1).replace(".", ",")}%
              </td>
              <td style={totalNum}>
                {Math.abs(desvioMargem) < 0.05 ? (
                  <span style={{ color: "#6B7A90" }}>—</span>
                ) : (
                  <span style={{ color: desvioMargem >= 0 ? "#12B76A" : "#E53935", fontWeight: 500 }}>
                    {desvioMargem >= 0 ? "▲" : "▼"} {desvioMargem >= 0 ? "+" : ""}
                    {desvioMargem.toFixed(1).replace(".", ",")}pp
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Gráfico */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "0.5px solid #E8ECF2",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1117", marginBottom: 12 }}>
          Previsto vs. Realizado por categoria
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="#E8ECF2" vertical={false} />
              <XAxis
                dataKey="categoria"
                tick={{ fontSize: 11, fill: "#6B7A90" }}
                axisLine={{ stroke: "#E8ECF2" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B7A90" }}
                axisLine={{ stroke: "#E8ECF2" }}
                tickLine={false}
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => formatBRL(value)}
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "0.5px solid #E8ECF2",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Previsto" fill="#1E6FBF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Realizado" fill="#12B76A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ContratoFinanceStripProps {
  contratoId: string;
  onVerDre?: () => void;
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const marginColor = (m: number) => {
  if (m >= 30) return "#12B76A";
  if (m >= 15) return "#E8A020";
  return "#E53935";
};

export function ContratoFinanceStrip({ contratoId, onVerDre }: ContratoFinanceStripProps) {
  const { data: dre } = useQuery({
    queryKey: ["dre", contratoId],
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

  const valorVenda = Number(dre?.valor_venda ?? 0);
  const custoPrev =
    Number(dre?.custo_produto_previsto ?? 0) +
    Number(dre?.custo_montagem_previsto ?? 0) +
    Number(dre?.custo_frete_previsto ?? 0) +
    Number(dre?.custo_comissao_previsto ?? 0) +
    Number(dre?.outros_custos_previstos ?? 0);
  const custoReal =
    Number(dre?.custo_produto_real ?? 0) +
    Number(dre?.custo_montagem_real ?? 0) +
    Number(dre?.custo_frete_real ?? 0) +
    Number(dre?.custo_comissao_real ?? 0) +
    Number(dre?.outros_custos_reais ?? 0);
  const margemPrev = Number(dre?.margem_prevista ?? 0);
  const margemReal = Number(dre?.margem_realizada ?? 0);
  const delta = margemReal - margemPrev;
  const hasReal = custoReal > 0;

  const Item = ({
    label,
    value,
    color = "#FFFFFF",
    extra,
  }: {
    label: string;
    value: string;
    color?: string;
    extra?: React.ReactNode;
  }) => (
    <div className="flex flex-col gap-1">
      <span
        style={{
          fontSize: 10,
          color: "#6B7A90",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span style={{ fontSize: 16, fontWeight: 500, color }}>{value}</span>
        {extra}
      </div>
    </div>
  );

  return (
    <div
      className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-4"
      style={{ backgroundColor: "#0D1117", padding: "16px 24px md:12px 32px" }}
    >
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
        <Item label="Receita líquida" value={formatBRL(valorVenda)} />
        <Item label="Custo previsto" value={formatBRL(custoPrev)} />
        <Item label="Custo real" value={hasReal ? formatBRL(custoReal) : "—"} />
        <Item
          label="Margem prevista"
          value={`${margemPrev.toFixed(1).replace(".", ",")}%`}
          color={marginColor(margemPrev)}
        />
        <Item
          label="Margem realizada"
          value={hasReal ? `${margemReal.toFixed(1).replace(".", ",")}%` : "—"}
          color={hasReal ? marginColor(margemReal) : "#6B7A90"}
          extra={
            hasReal ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: delta >= 0 ? "#12B76A" : "#E53935",
                }}
              >
                {delta >= 0 ? "▲" : "▼"} {delta >= 0 ? "+" : ""}
                {delta.toFixed(1).replace(".", ",")}pp
              </span>
            ) : null
          }
        />
      </div>

      <button
        onClick={onVerDre}
        className="inline-flex w-full md:w-auto items-center justify-center gap-1 rounded-md border px-3 py-1.5 transition-colors hover:bg-white/10"
        style={{ borderColor: "#FFFFFF", color: "#FFFFFF", fontSize: 12 }}
      >
        Ver DRE completo
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

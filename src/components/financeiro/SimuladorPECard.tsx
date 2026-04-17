import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  custoFixoTotal: number;
  mes: string; // 'YYYY-MM-01'
}

const TICKET_MEDIO = 35000;

function fmtBRL(v: number) {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function SimuladorPECard({ custoFixoTotal, mes }: Props) {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id ?? null;

  const [margem, setMargem] = useState<number>(31);
  const [custoFixo, setCustoFixo] = useState<number>(48000);
  const [meta, setMeta] = useState<number>(0);
  const [faturamentoAtual, setFaturamentoAtual] = useState<number>(0);

  // Sync custo fixo with left column total
  useEffect(() => {
    if (custoFixoTotal > 0) setCustoFixo(Math.round(custoFixoTotal));
  }, [custoFixoTotal]);

  // Load faturamento atual from vw_contratos_dre for the selected month
  useEffect(() => {
    if (!lojaId || !mes) return;
    const start = mes;
    const d = new Date(mes);
    d.setMonth(d.getMonth() + 1);
    const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    (async () => {
      const { data, error } = await supabase
        .from("vw_contratos_dre")
        .select("valor_venda,created_at")
        .eq("loja_id", lojaId)
        .gte("created_at", start)
        .lt("created_at", end);
      if (error) { setFaturamentoAtual(0); return; }
      setFaturamentoAtual((data ?? []).reduce((s, r) => s + Number(r.valor_venda || 0), 0));
    })();
  }, [lojaId, mes]);

  const peBasico = useMemo(() => (margem > 0 ? custoFixo / (margem / 100) : Infinity), [custoFixo, margem]);
  const peComLucro = useMemo(() => (margem > 0 ? (custoFixo + meta) / (margem / 100) : Infinity), [custoFixo, meta, margem]);
  const contratos = useMemo(() => Math.ceil((peComLucro || 0) / TICKET_MEDIO), [peComLucro]);

  const pct = peBasico > 0 && isFinite(peBasico) ? Math.min(200, (faturamentoAtual / peBasico) * 100) : 0;
  const fillColor = pct >= 100 ? "#12B76A" : "#1E6FBF";
  const fillWidth = Math.min(100, pct);

  let badge = { txt: "Abaixo do PE", bg: "#FDECEA", color: "#E53935" };
  if (faturamentoAtual >= peBasico && faturamentoAtual <= peBasico * 1.001) {
    badge = { txt: "No PE", bg: "#FEF3C7", color: "#E8A020" };
  } else if (faturamentoAtual > peBasico) {
    badge = { txt: "Acima do PE ✓", bg: "#D1FAE5", color: "#05873C" };
  }

  const divider = { borderTop: "0.5px solid #2A3F5F" };

  return (
    <div
      className="rounded-xl p-5 text-white"
      style={{ background: "#0D1117" }}
    >
      <p className="text-[16px] font-medium">Ponto de equilíbrio</p>
      <p className="mt-2 text-[36px] font-medium leading-tight tabular-nums">
        {fmtBRL(peBasico)}
      </p>

      <div className="my-4" style={divider} />

      <div className="space-y-5">
        <SliderRow
          label="Margem bruta média"
          value={`${margem}%`}
          slider={
            <Slider value={[margem]} min={10} max={60} step={1}
              onValueChange={(v) => setMargem(v[0])} />
          }
        />
        <SliderRow
          label="Custo fixo mensal"
          value={fmtBRL(custoFixo)}
          slider={
            <Slider value={[custoFixo]} min={10000} max={200000} step={1000}
              onValueChange={(v) => setCustoFixo(v[0])} />
          }
        />
        <SliderRow
          label="Meta de lucro mensal"
          value={fmtBRL(meta)}
          slider={
            <Slider value={[meta]} min={0} max={100000} step={500}
              onValueChange={(v) => setMeta(v[0])} />
          }
        />
      </div>

      <div className="my-4" style={divider} />

      <div className="space-y-3">
        <div>
          <p className="text-[12px]" style={{ color: "#6B7A90" }}>Vender para cobrir custos</p>
          <p className="text-[20px] font-medium tabular-nums">{fmtBRL(peBasico)}</p>
        </div>
        {meta > 0 && (
          <div>
            <p className="text-[12px]" style={{ color: "#6B7A90" }}>
              Vender para ter {fmtBRL(meta)} de lucro
            </p>
            <p className="text-[20px] font-medium tabular-nums" style={{ color: "#12B76A" }}>
              {fmtBRL(peComLucro)}
            </p>
          </div>
        )}
        <div>
          <p className="text-[12px]" style={{ color: "#6B7A90" }}>
            Contratos/mês (ticket médio {fmtBRL(TICKET_MEDIO)})
          </p>
          <p className="text-[16px]">~{isFinite(contratos) ? contratos : "—"} contratos</p>
        </div>
      </div>

      <div className="my-4" style={divider} />

      <div className="space-y-3">
        <div className="flex items-center justify-between text-[13px]">
          <span style={{ color: "#6B7A90" }}>Faturamento atual</span>
          <span className="tabular-nums">{fmtBRL(faturamentoAtual)}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span style={{ color: "#6B7A90" }}>PE calculado</span>
          <span className="tabular-nums">{fmtBRL(peBasico)}</span>
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "#2A3F5F" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${fillWidth}%`, background: fillColor }} />
          </div>
          <p className="mt-1 text-[12px]" style={{ color: "#6B7A90" }}>
            {Math.round(pct)}% do PE atingido
          </p>
        </div>

        <span
          className="inline-block rounded-full px-2.5 py-1 text-[12px] font-medium"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.txt}
        </span>
      </div>

      <div className="mt-4 space-y-0.5 text-[11px]" style={{ color: "#3D4A5C" }}>
        <p>PE = Custo fixo ÷ Margem (%)</p>
        <p>PE + lucro = (Custo fixo + Meta) ÷ Margem (%)</p>
      </div>
    </div>
  );
}

function SliderRow({ label, value, slider }: { label: string; value: string; slider: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] text-white">{label}</span>
        <span className="text-[14px] font-medium" style={{ color: "#00AAFF" }}>{value}</span>
      </div>
      {slider}
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { REGRA_PADRAO, type RegraComissao } from "./ComissoesRelatorioTab";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtPct(v: number) {
  return `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

interface Props {
  regra?: RegraComissao;
  onEdit?: () => void;
}

export function ComissoesRegrasTab({ regra = REGRA_PADRAO, onEdit }: Props) {
  const exemploValor = 38400;
  const exemploMargem = 32;
  const base = exemploValor * regra.percentual_base;
  const bonus = exemploMargem >= regra.margem_min_bonus ? exemploValor * regra.percentual_bonus : 0;
  const total = base + bonus;

  return (
    <div className="rounded-md border bg-white" style={{ borderColor: "#E8ECF2" }}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #E8ECF2" }}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[#0D1117]">Regra padrão</h3>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "#D1FAE5", color: "#05873C" }}
          >
            Ativa ✓
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="h-8"
          style={{ borderColor: "#1E6FBF", color: "#1E6FBF" }}
        >
          <Pencil className="mr-1 h-3 w-3" />
          Editar regra
        </Button>
      </div>

      <div className="grid gap-6 p-4 md:grid-cols-2">
        <div>
          <p className="text-xs text-[#6B7A90]">Percentual base</p>
          <p className="mt-1 text-2xl font-medium tabular-nums text-[#0D1117]">
            {fmtPct(regra.percentual_base)}
          </p>
          <p className="mt-1 text-xs text-[#6B7A90]">
            Aplicado sobre o valor de venda de cada contrato finalizado
          </p>
        </div>
        <div>
          <p className="text-xs text-[#6B7A90]">Bônus por margem</p>
          <p className="mt-1 text-2xl font-medium tabular-nums" style={{ color: "#E8A020" }}>
            +{fmtPct(regra.percentual_bonus)}
          </p>
          <p className="mt-1 text-xs text-[#6B7A90]">
            Adicional quando margem realizada ≥ {regra.margem_min_bonus}%
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="mb-2 text-xs font-medium text-[#6B7A90]">Exemplo ao vivo</p>
        <div className="rounded-md p-4" style={{ background: "#F5F7FA" }}>
          <p className="text-sm text-[#0D1117]">
            Contrato de{" "}
            <span className="font-medium tabular-nums">{fmtBRL(exemploValor)}</span> com margem de{" "}
            <span className="font-medium tabular-nums">{exemploMargem}%</span>
          </p>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-[#6B7A90]">Comissão base:</span>
              <span className="tabular-nums text-[#0D1117]">
                {fmtBRL(base)}{" "}
                <span className="text-xs text-[#6B7A90]">({fmtPct(regra.percentual_base)})</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[#6B7A90]">Bônus:</span>
              <span className="tabular-nums" style={{ color: "#E8A020" }}>
                {fmtBRL(bonus)}{" "}
                <span className="text-xs">({fmtPct(regra.percentual_bonus)})</span>
              </span>
            </div>
            <div
              className="mt-2 flex items-baseline justify-between border-t pt-2"
              style={{ borderColor: "#E8ECF2" }}
            >
              <span className="text-[#6B7A90]">Total:</span>
              <span
                className="text-base tabular-nums"
                style={{ color: "#12B76A", fontWeight: 500 }}
              >
                {fmtBRL(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

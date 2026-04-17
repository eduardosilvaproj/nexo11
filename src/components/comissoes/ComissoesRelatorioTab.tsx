import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type RegraComissao = {
  percentual_base: number; // ex: 0.05
  margem_min_bonus: number; // ex: 25 (em %)
  percentual_bonus: number; // ex: 0.01
};

export const REGRA_PADRAO: RegraComissao = {
  percentual_base: 0.05,
  margem_min_bonus: 25,
  percentual_bonus: 0.01,
};

type ContratoDre = {
  id: string;
  vendedor_id: string | null;
  valor_venda: number | null;
  margem_realizada: number | null;
  data_finalizacao: string | null;
};

type LinhaVendedor = {
  vendedor_id: string;
  nome: string;
  contratos: number;
  faturamento: number;
  margemMedia: number;
  base: number;
  bonus: number;
  total: number;
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function iniciais(nome: string) {
  const parts = nome.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}
function corMargem(m: number) {
  if (m >= 30) return "#12B76A";
  if (m >= 15) return "#E8A020";
  return "#E53935";
}

interface Props {
  mes: string; // YYYY-MM-01
  regra?: RegraComissao;
}

export function ComissoesRelatorioTab({ mes, regra = REGRA_PADRAO }: Props) {
  const [linhas, setLinhas] = useState<LinhaVendedor[]>([]);
  const [pagos, setPagos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [alvo, setAlvo] = useState<LinhaVendedor | null>(null);

  const inicio = mes;
  const fim = useMemo(() => {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [mes]);

  useEffect(() => {
    setPagos(new Set());
  }, [mes]);

  useEffect(() => {
    let cancel = false;
    async function carregar() {
      setLoading(true);
      const { data: contratos, error } = await supabase
        .from("vw_contratos_dre")
        .select("id, vendedor_id, valor_venda, margem_realizada, data_finalizacao")
        .gte("data_finalizacao", `${inicio}T00:00:00`)
        .lte("data_finalizacao", `${fim}T23:59:59`)
        .not("vendedor_id", "is", null);

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const lista = (contratos ?? []) as ContratoDre[];
      const ids = Array.from(new Set(lista.map((c) => c.vendedor_id!).filter(Boolean)));
      const nomes: Record<string, string> = {};
      if (ids.length) {
        const { data: us } = await supabase
          .from("usuarios_publico")
          .select("id, nome")
          .in("id", ids);
        (us ?? []).forEach((u: { id: string | null; nome: string | null }) => {
          if (u.id) nomes[u.id] = u.nome ?? "—";
        });
      }

      const agg: Record<string, LinhaVendedor> = {};
      for (const c of lista) {
        const vid = c.vendedor_id!;
        const valor = Number(c.valor_venda ?? 0);
        const margem = Number(c.margem_realizada ?? 0);
        if (!agg[vid]) {
          agg[vid] = {
            vendedor_id: vid,
            nome: nomes[vid] ?? "—",
            contratos: 0,
            faturamento: 0,
            margemMedia: 0,
            base: 0,
            bonus: 0,
            total: 0,
          };
        }
        const a = agg[vid];
        a.contratos += 1;
        a.faturamento += valor;
        // média ponderada por faturamento
        a.margemMedia =
          a.faturamento > 0
            ? (a.margemMedia * (a.faturamento - valor) + margem * valor) / a.faturamento
            : 0;
      }
      Object.values(agg).forEach((a) => {
        a.base = a.faturamento * regra.percentual_base;
        a.bonus = a.margemMedia >= regra.margem_min_bonus ? a.faturamento * regra.percentual_bonus : 0;
        a.total = a.base + a.bonus;
      });
      const arr = Object.values(agg).sort((x, y) => y.total - x.total);
      if (!cancel) setLinhas(arr);
      setLoading(false);
    }
    carregar();
    return () => {
      cancel = true;
    };
  }, [inicio, fim, regra]);

  const totais = useMemo(() => {
    const fat = linhas.reduce((s, l) => s + l.faturamento, 0);
    const base = linhas.reduce((s, l) => s + l.base, 0);
    const bonus = linhas.reduce((s, l) => s + l.bonus, 0);
    const total = base + bonus;
    const margemPond = fat > 0 ? linhas.reduce((s, l) => s + l.margemMedia * l.faturamento, 0) / fat : 0;
    return { fat, base, bonus, total, margemPond };
  }, [linhas]);

  function confirmarPago() {
    if (!alvo) return;
    setPagos((p) => new Set(p).add(alvo.vendedor_id));
    toast.success("Comissão marcada como paga");
    setAlvo(null);
  }

  if (!loading && linhas.length === 0) {
    return (
      <div
        className="rounded-md px-4 py-12 text-center"
        style={{ background: "#F5F7FA", border: "1px dashed #B0BAC9" }}
      >
        <p className="text-sm font-medium text-[#0D1117]">Nenhuma comissão no período</p>
        <p className="mt-1 text-xs text-[#6B7A90]">
          As comissões são calculadas automaticamente ao finalizar contratos
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-md border" style={{ borderColor: "#E8ECF2" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "#F5F7FA", color: "#6B7A90" }}>
            <tr>
              <th className="px-3 py-2 text-left font-medium">Vendedor</th>
              <th className="px-3 py-2 text-right font-medium">Contratos</th>
              <th className="px-3 py-2 text-right font-medium">Faturamento</th>
              <th className="px-3 py-2 text-right font-medium">Margem média</th>
              <th className="px-3 py-2 text-right font-medium">Comissão base</th>
              <th className="px-3 py-2 text-right font-medium">Bônus</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#E8ECF2" }}>
            {linhas.map((l) => {
              const pago = pagos.has(l.vendedor_id);
              const temBonus = l.bonus > 0;
              return (
                <tr key={l.vendedor_id}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
                        style={{ background: "#1E6FBF" }}
                      >
                        {iniciais(l.nome)}
                      </div>
                      <span>{l.nome}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{l.contratos}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(l.faturamento)}</td>
                  <td
                    className="px-3 py-2 text-right tabular-nums font-medium"
                    style={{ color: corMargem(l.margemMedia) }}
                  >
                    {l.margemMedia.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#0D1117" }}>
                    {fmtBRL(l.base)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {temBonus ? (
                      <span style={{ color: "#E8A020" }}>{fmtBRL(l.bonus)}</span>
                    ) : (
                      <span style={{ color: "#B0BAC9" }}>—</span>
                    )}
                  </td>
                  <td
                    className="px-3 py-2 text-right tabular-nums"
                    style={{ fontWeight: 500, color: temBonus ? "#12B76A" : "#0D1117" }}
                  >
                    {fmtBRL(l.total)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={
                        pago
                          ? { background: "#D1FAE5", color: "#05873C" }
                          : { background: "#FEF3C7", color: "#E8A020" }
                      }
                    >
                      {pago ? "Pago" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      {!pago && (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-white hover:opacity-90"
                          style={{ background: "#05873C" }}
                          onClick={() => setAlvo(l)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Marcar como pago
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: "#F5F7FA", fontWeight: 500 }}>
              <td className="px-3 py-2 text-[#6B7A90]">—</td>
              <td className="px-3 py-2 text-right text-[#6B7A90]">—</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(totais.fat)}</td>
              <td
                className="px-3 py-2 text-right tabular-nums"
                style={{ color: corMargem(totais.margemPond) }}
              >
                {totais.margemPond.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(totais.base)}</td>
              <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#E8A020" }}>
                {fmtBRL(totais.bonus)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#12B76A" }}>
                {fmtBRL(totais.total)}
              </td>
              <td className="px-3 py-2 text-[#6B7A90]">—</td>
              <td className="px-3 py-2 text-right text-[#6B7A90]">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Dialog open={!!alvo} onOpenChange={(v) => !v && setAlvo(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Confirmar pagamento de comissão</DialogTitle>
          </DialogHeader>
          {alvo && (
            <div className="space-y-2 text-sm">
              <p>
                Vendedor: <span className="font-medium">{alvo.nome}</span>
              </p>
              <p>
                Total: <span className="font-medium tabular-nums">{fmtBRL(alvo.total)}</span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvo(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarPago}
              className="text-white hover:opacity-90"
              style={{ background: "#12B76A" }}
            >
              <Check className="mr-1 h-4 w-4" />
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

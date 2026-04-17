import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PagamentoConfirmDialog } from "./PagamentoConfirmDialog";

type Status = "pendente" | "pago" | "cancelado";
type Tipo = "receita" | "despesa";
type Conta = {
  id: string;
  tipo: Tipo;
  descricao: string;
  categoria: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: Status;
  contrato_id: string | null;
  contratos?: { id: string; cliente_nome: string } | null;
};
type FiltroKey = "todas" | "pendente" | "atrasado" | "pago";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

const STATUS_STYLE: Record<Status | "atrasado", { bg: string; fg: string; label: string }> = {
  pendente: { bg: "#FEF3C7", fg: "#E8A020", label: "Pendente" },
  pago: { bg: "#D1FAE5", fg: "#05873C", label: "Pago" },
  atrasado: { bg: "#FDECEA", fg: "#E53935", label: "Atrasado" },
  cancelado: { bg: "#E8ECF2", fg: "#B0BAC9", label: "Cancelado" },
};

export function ContasCard() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [pagamentoAlvo, setPagamentoAlvo] = useState<{ id: string; descricao: string; valor: number } | null>(null);
  const [filtroReceber, setFiltroReceber] = useState<FiltroKey>("todas");
  const [filtroPagar, setFiltroPagar] = useState<FiltroKey>("todas");
  const hojeStr = new Date().toISOString().slice(0, 10);

  async function carregar() {
    const { data, error } = await supabase
      .from("transacoes")
      .select("id, tipo, descricao, categoria, valor, data_vencimento, data_pagamento, status, contrato_id, contratos(id, cliente_nome)")
      .order("data_vencimento", { ascending: true });
    if (error) { toast.error(error.message); return; }
    setContas((data ?? []) as unknown as Conta[]);
  }
  useEffect(() => { carregar(); }, []);

  async function cancelar(id: string) {
    if (!window.confirm("Cancelar este lançamento?")) return;
    const { error } = await supabase.from("transacoes").update({ status: "cancelado" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Lançamento cancelado");
    carregar();
  }

  const aReceber = useMemo(() => contas.filter((c) => c.tipo === "receita"), [contas]);
  const aPagar = useMemo(() => contas.filter((c) => c.tipo === "despesa"), [contas]);

  function statusKey(c: Conta): Status | "atrasado" {
    if (c.status === "pendente" && c.data_vencimento < hojeStr) return "atrasado";
    return c.status;
  }

  function aplicaFiltro(arr: Conta[], f: FiltroKey) {
    if (f === "todas") return arr;
    return arr.filter((c) => statusKey(c) === f);
  }

  function totalPendentes(arr: Conta[]) {
    return arr.filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.valor), 0);
  }
  function totalAtrasados(arr: Conta[]) {
    return arr.filter((c) => c.status === "pendente" && c.data_vencimento < hojeStr).reduce((s, c) => s + Number(c.valor), 0);
  }

  function Coluna({
    titulo,
    arr,
    filtro,
    setFiltro,
    totalCor,
    acaoLabel,
    variant,
  }: {
    titulo: string;
    arr: Conta[];
    filtro: FiltroKey;
    setFiltro: (f: FiltroKey) => void;
    totalCor: string;
    acaoLabel: string;
    variant: "receber" | "pagar";
  }) {
    const totalGeral = arr.filter((c) => c.status !== "cancelado").reduce((s, c) => s + Number(c.valor), 0);
    const rows = aplicaFiltro(arr, filtro);
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">{titulo}</CardTitle>
            <p className="mt-1 tabular-nums" style={{ fontSize: 20, fontWeight: 500, color: totalCor }}>
              {fmtBRL(totalGeral)}
            </p>
          </div>
          <Select value={filtro} onValueChange={(v) => setFiltro(v as FiltroKey)}>
            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#6B7A90]">Nenhum lançamento encontrado</div>
          ) : (
            <div className="overflow-hidden rounded-md border" style={{ borderColor: "#E8ECF2" }}>
              <table className="w-full text-sm">
                <thead style={{ background: "#F5F7FA", color: "#6B7A90" }}>
                  <tr>
                    {variant === "receber" ? (
                      <>
                        <th className="px-3 py-2 text-left font-medium">Cliente</th>
                        <th className="px-3 py-2 text-left font-medium">Contrato</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-left font-medium">Descrição</th>
                        <th className="px-3 py-2 text-left font-medium">Categoria</th>
                      </>
                    )}
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 text-left font-medium">Vencimento</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "#E8ECF2" }}>
                  {rows.map((c) => {
                    const key = statusKey(c);
                    const atrasado = key === "atrasado";
                    const cancelado = c.status === "cancelado";
                    const s = STATUS_STYLE[key];
                    const col1 = variant === "receber" ? (c.contratos?.cliente_nome ?? "—") : c.descricao;
                    const col2 = variant === "receber"
                      ? (c.contrato_id ? `#${c.contrato_id.slice(0, 8)}` : c.descricao)
                      : c.categoria;
                    return (
                      <tr
                        key={c.id}
                        style={atrasado ? { background: "#FFF8F8" } : undefined}
                        className={cancelado ? "line-through" : undefined}
                      >
                        <td className="px-3 py-2">{col1}</td>
                        <td className="px-3 py-2 text-[#6B7A90]">{col2}</td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: c.tipo === "receita" ? "#05873C" : "#E53935" }}>
                          {fmtBRL(Number(c.valor))}
                        </td>
                        <td className="px-3 py-2">{fmtData(c.data_vencimento)}</td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ background: s.bg, color: s.fg }}
                          >
                            {s.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {c.status === "pendente" && (
                              <Button
                                size="sm"
                                className="h-7 px-2 text-white hover:opacity-90"
                                style={{ background: "#05873C" }}
                                onClick={() =>
                                  setPagamentoAlvo({ id: c.id, descricao: c.descricao, valor: Number(c.valor) })
                                }
                              >
                                <Check className="mr-1 h-3 w-3" />
                                {acaoLabel}
                              </Button>
                            )}
                            {!cancelado && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-[#6B7A90] hover:text-[#E53935]"
                                onClick={() => cancelar(c.id)}
                                aria-label="Cancelar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-3 text-sm" style={{ borderColor: "#E8ECF2" }}>
            <span className="text-[#6B7A90]">
              Total pendente:{" "}
              <span className="tabular-nums font-medium" style={{ color: "#05873C" }}>
                {fmtBRL(totalPendentes(arr))}
              </span>
            </span>
            <span className="text-[#6B7A90]">
              Total atrasado:{" "}
              <span className="tabular-nums font-medium" style={{ color: "#E53935" }}>
                {fmtBRL(totalAtrasados(arr))}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Coluna
          titulo="A receber"
          arr={aReceber}
          filtro={filtroReceber}
          setFiltro={setFiltroReceber}
          totalCor="#12B76A"
          acaoLabel="Marcar pago"
        />
        <Coluna
          titulo="A pagar"
          arr={aPagar}
          filtro={filtroPagar}
          setFiltro={setFiltroPagar}
          totalCor="#E53935"
          acaoLabel="Marcar pago"
        />
      </div>

      <PagamentoConfirmDialog
        open={!!pagamentoAlvo}
        onOpenChange={(v) => !v && setPagamentoAlvo(null)}
        transacao={pagamentoAlvo}
        onConfirmed={carregar}
      />
    </div>
  );
}

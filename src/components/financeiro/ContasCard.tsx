import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PagamentoConfirmDialog } from "./PagamentoConfirmDialog";

type Status = "pendente" | "pago" | "cancelado" | "atrasado";
type Conta = {
  id: string;
  descricao: string;
  categoria?: string;
  valor: number;
  vencimento: string;
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

const STATUS_STYLE: Record<Status, { bg: string; fg: string; label: string }> = {
  pendente: { bg: "#FEF3C7", fg: "#E8A020", label: "Pendente" },
  pago: { bg: "#D1FAE5", fg: "#05873C", label: "Pago" },
  atrasado: { bg: "#FDECEA", fg: "#E53935", label: "Atrasado" },
  cancelado: { bg: "#E8ECF2", fg: "#B0BAC9", label: "Cancelado" },
};

export function ContasCard() {
  const [receber, setReceber] = useState<Conta[]>([]);
  const [pagar, setPagar] = useState<Conta[]>([]);
  const [pagamentoAlvo, setPagamentoAlvo] = useState<{ id: string; descricao: string; valor: number; tipo: 'receita' | 'despesa' } | null>(null);
  const [filtroReceber, setFiltroReceber] = useState<FiltroKey>("todas");
  const [filtroPagar, setFiltroPagar] = useState<FiltroKey>("todas");
  const hojeStr = new Date().toISOString().slice(0, 10);

  async function carregar() {
    const [resReceber, resPagar] = await Promise.all([
      supabase
        .from("financeiro_contas_receber")
        .select("id, descricao, valor, vencimento, data_pagamento, status, contrato_id, contratos(id, cliente_nome)")
        .order("vencimento", { ascending: true }),
      supabase
        .from("financeiro_contas_pagar")
        .select("id, descricao, categoria, valor, vencimento, data_pagamento, status, contrato_id, contratos(id, cliente_nome)")
        .order("vencimento", { ascending: true })
    ]);

    if (resReceber.error) toast.error(resReceber.error.message);
    if (resPagar.error) toast.error(resPagar.error.message);

    setReceber((resReceber.data ?? []) as any);
    setPagar((resPagar.data ?? []) as any);
  }

  useEffect(() => { carregar(); }, []);

  async function cancelar(id: string, tipo: 'receita' | 'despesa') {
    if (!window.confirm("Cancelar este lançamento?")) return;
    const table = tipo === 'receita' ? "financeiro_contas_receber" : "financeiro_contas_pagar";
    const { error } = await supabase.from(table).update({ status: "cancelado" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Lançamento cancelado");
    carregar();
  }

  function getStatus(c: Conta): Status {
    if (c.status === "pendente" && c.vencimento < hojeStr) return "atrasado";
    return c.status;
  }

  function aplicaFiltro(arr: Conta[], f: FiltroKey) {
    if (f === "todas") return arr.filter(c => c.status !== 'cancelado');
    return arr.filter((c) => getStatus(c) === f);
  }

  function totalPorStatus(arr: Conta[], status: Status | 'atrasado') {
    return arr.filter((c) => getStatus(c) === status).reduce((s, c) => s + Number(c.valor), 0);
  }

  function Coluna({
    titulo,
    arr,
    filtro,
    setFiltro,
    totalCor,
    variant,
  }: {
    titulo: string;
    arr: Conta[];
    filtro: FiltroKey;
    setFiltro: (f: FiltroKey) => void;
    totalCor: string;
    variant: "receber" | "pagar";
  }) {
    const totalGeral = arr.filter((c) => c.status !== "cancelado").reduce((s, c) => s + Number(c.valor), 0);
    const rows = aplicaFiltro(arr, filtro);
    
    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base font-semibold">{titulo}</CardTitle>
            <p className="mt-1 tabular-nums text-2xl font-bold" style={{ color: totalCor }}>
              {fmtBRL(totalGeral)}
            </p>
          </div>
          <Select value={filtro} onValueChange={(v) => setFiltro(v as FiltroKey)}>
            <SelectTrigger className="h-8 w-[140px] bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Ativas</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground/20" />
              <p className="mt-2 text-sm text-muted-foreground">Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#E8ECF2]">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] text-[#64748B]">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium">Descrição</th>
                    <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                    <th className="px-3 py-2.5 text-left font-medium">Vencimento</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF2]">
                  {rows.map((c) => {
                    const status = getStatus(c);
                    const style = STATUS_STYLE[status];
                    const isReceita = variant === "receber";
                    
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-3">
                          <div className="font-medium text-[#1E293B]">{c.descricao}</div>
                          {c.contratos && (
                            <div className="text-[11px] text-[#64748B]">
                              Contrato: {c.contratos.cliente_nome}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold" style={{ color: isReceita ? "#10B981" : "#EF4444" }}>
                          {fmtBRL(Number(c.valor))}
                        </td>
                        <td className="px-3 py-3 text-[#64748B]">{fmtData(c.vencimento)}</td>
                        <td className="px-3 py-3">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                            style={{ background: style.bg, color: style.fg }}
                          >
                            {style.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {c.status === "pendente" && (
                              <Button
                                size="sm"
                                className="h-7 px-2 text-white bg-[#1E6FBF] hover:bg-[#1E6FBF]/90"
                                onClick={() => setPagamentoAlvo({ id: c.id, descricao: c.descricao, valor: Number(c.valor), tipo: isReceita ? 'receita' : 'despesa' })}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Pagar
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => cancelar(c.id, isReceita ? 'receita' : 'despesa')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Pago</p>
              <p className="text-lg font-bold text-emerald-700">{fmtBRL(totalPorStatus(arr, 'pago'))}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Total Pendente</p>
              <p className="text-lg font-bold text-amber-700">{fmtBRL(totalPorStatus(arr, 'pendente') + totalPorStatus(arr, 'atrasado'))}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Coluna
          titulo="Contas a Receber"
          arr={receber}
          filtro={filtroReceber}
          setFiltro={setFiltroReceber}
          totalCor="#10B981"
          variant="receber"
        />
        <Coluna
          titulo="Contas a Pagar"
          arr={pagar}
          filtro={filtroPagar}
          setFiltro={setFiltroPagar}
          totalCor="#EF4444"
          variant="pagar"
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

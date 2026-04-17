import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
};

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
  const hojeStr = new Date().toISOString().slice(0, 10);

  async function carregar() {
    const { data, error } = await supabase
      .from("transacoes")
      .select("id, tipo, descricao, categoria, valor, data_vencimento, data_pagamento, status")
      .order("data_vencimento", { ascending: true });
    if (error) { toast.error(error.message); return; }
    setContas((data ?? []) as Conta[]);
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

  function totalAbertos(arr: Conta[]) {
    return arr
      .filter((c) => c.status === "pendente")
      .reduce((s, c) => s + Number(c.valor), 0);
  }
  function totalAtrasados(arr: Conta[]) {
    return arr
      .filter((c) => c.status === "pendente" && c.data_vencimento < hojeStr)
      .reduce((s, c) => s + Number(c.valor), 0);
  }
  function totalPagos(arr: Conta[]) {
    return arr
      .filter((c) => c.status === "pago")
      .reduce((s, c) => s + Number(c.valor), 0);
  }

  function Tabela({ rows }: { rows: Conta[] }) {
    if (rows.length === 0) {
      return (
        <div className="py-10 text-center text-sm text-[#6B7A90]">
          Nenhum lançamento encontrado
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-md border" style={{ borderColor: "#E8ECF2" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "#F5F7FA", color: "#6B7A90" }}>
            <tr>
              <th className="px-3 py-2 text-left font-medium">Vencimento</th>
              <th className="px-3 py-2 text-left font-medium">Descrição</th>
              <th className="px-3 py-2 text-left font-medium">Categoria</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
              <th className="px-3 py-2 text-left font-medium">Pagamento</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#E8ECF2" }}>
            {rows.map((c) => {
              const atrasado = c.status === "pendente" && c.data_vencimento < hojeStr;
              const key: Status | "atrasado" = atrasado ? "atrasado" : c.status;
              const s = STATUS_STYLE[key];
              const cancelado = c.status === "cancelado";
              return (
                <tr
                  key={c.id}
                  style={atrasado ? { background: "#FFF8F8" } : undefined}
                  className={cancelado ? "line-through" : undefined}
                >
                  <td className="px-3 py-2">{fmtData(c.data_vencimento)}</td>
                  <td className="px-3 py-2">{c.descricao}</td>
                  <td className="px-3 py-2 text-[#6B7A90]">{c.categoria}</td>
                  <td
                    className="px-3 py-2 text-right tabular-nums"
                    style={{ color: c.tipo === "receita" ? "#05873C" : "#E53935" }}
                  >
                    {fmtBRL(Number(c.valor))}
                  </td>
                  <td className="px-3 py-2">{fmtData(c.data_pagamento)}</td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: s.bg, color: s.fg }}
                    >
                      {s.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
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
                          {c.tipo === "receita" ? "Receber" : "Pagar"}
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
    );
  }

  function Resumo({ arr, labelEmAberto }: { arr: Conta[]; labelEmAberto: string }) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <Card style={{ borderTop: "3px solid #E8A020" }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{labelEmAberto}</p>
            <p className="mt-1 text-xl font-medium tabular-nums" style={{ color: "#E8A020" }}>
              {fmtBRL(totalAbertos(arr))}
            </p>
          </CardContent>
        </Card>
        <Card style={{ borderTop: "3px solid #E53935" }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Atrasados</p>
            <p className="mt-1 text-xl font-medium tabular-nums" style={{ color: "#E53935" }}>
              {fmtBRL(totalAtrasados(arr))}
            </p>
          </CardContent>
        </Card>
        <Card style={{ borderTop: "3px solid #05873C" }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pagos</p>
            <p className="mt-1 text-xl font-medium tabular-nums" style={{ color: "#05873C" }}>
              {fmtBRL(totalPagos(arr))}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pagar">
        <TabsList>
          <TabsTrigger value="pagar">A pagar ({aPagar.length})</TabsTrigger>
          <TabsTrigger value="receber">A receber ({aReceber.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pagar" className="mt-4 space-y-4">
          <Resumo arr={aPagar} labelEmAberto="Em aberto" />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contas a pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabela rows={aPagar} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receber" className="mt-4 space-y-4">
          <Resumo arr={aReceber} labelEmAberto="A receber" />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contas a receber</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabela rows={aReceber} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PagamentoConfirmDialog
        open={!!pagamentoAlvo}
        onOpenChange={(v) => !v && setPagamentoAlvo(null)}
        transacao={pagamentoAlvo}
        onConfirmed={carregar}
      />
    </div>
  );
}

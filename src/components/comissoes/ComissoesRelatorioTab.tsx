import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mantido para compatibilidade com Comissoes.tsx (legado)
export type RegraComissao = {
  percentual_base: number;
  margem_min_bonus: number;
  percentual_bonus: number;
};
export const REGRA_PADRAO: RegraComissao = {
  percentual_base: 0.05,
  margem_min_bonus: 25,
  percentual_bonus: 0.01,
};

type Linha = {
  id: string;
  usuario_id: string;
  pessoa: string;
  papel: string;
  contrato_id: string;
  contrato_cliente: string;
  base_calculo: number;
  percentual: number;
  valor: number;
  status: string;
  data_gatilho: string | null;
  data_pagamento: string | null;
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
function iniciais(nome: string) {
  const parts = (nome ?? "").trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return ((a + b) || "—").toUpperCase();
}

interface Props {
  mes: string; // YYYY-MM-01
  mesLabel?: string;
  regra?: RegraComissao;
  podePagar?: boolean;
  apenasProprio?: boolean;
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pendente: { bg: "#FEF3C7", fg: "#9A6700", label: "Pendente" },
  liberada: { bg: "#DBE9FF", fg: "#1E6FBF", label: "Liberada" },
  paga: { bg: "#D1FAE5", fg: "#05873C", label: "Paga" },
  cancelada: { bg: "#FEE2E2", fg: "#B42318", label: "Cancelada" },
};

export function ComissoesRelatorioTab({
  mes,
  mesLabel,
  podePagar = true,
  apenasProprio = false,
}: Props) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(false);
  const [alvoPagar, setAlvoPagar] = useState<Linha | null>(null);
  const [alvoCancelar, setAlvoCancelar] = useState<Linha | null>(null);
  const [dataPagamento, setDataPagamento] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [processando, setProcessando] = useState(false);

  const inicio = mes;
  const fim = useMemo(() => {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [mes]);

  async function carregar() {
    setLoading(true);
    try {
      let query = supabase
        .from("comissoes")
        .select(
          "id, usuario_id, papel_id, contrato_id, base_calculo, percentual, valor, status, data_gatilho, data_pagamento"
        )
        .gte("data_gatilho", `${inicio}T00:00:00`)
        .lte("data_gatilho", `${fim}T23:59:59`)
        .in("status", ["pendente", "liberada", "paga"])
        .order("data_gatilho", { ascending: false });

      if (apenasProprio) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user?.id) query = query.eq("usuario_id", u.user.id);
      }

      const { data: comissoes, error } = await query;
      if (error) throw error;
      const rows = comissoes ?? [];
      if (!rows.length) {
        setLinhas([]);
        return;
      }

      const userIds = Array.from(new Set(rows.map((r) => r.usuario_id)));
      const papelIds = Array.from(new Set(rows.map((r) => r.papel_id).filter(Boolean)));
      const contratoIds = Array.from(new Set(rows.map((r) => r.contrato_id)));

      const [usrRes, papRes, ctrRes] = await Promise.all([
        userIds.length
          ? supabase.from("usuarios_publico").select("id, nome").in("id", userIds)
          : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null }> }),
        papelIds.length
          ? supabase.from("papeis_comissao").select("id, nome").in("id", papelIds)
          : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null }> }),
        contratoIds.length
          ? supabase
              .from("contratos")
              .select("id, cliente_nome")
              .in("id", contratoIds)
          : Promise.resolve({ data: [] as Array<{ id: string; cliente_nome: string | null }> }),
      ]);

      const nomes = new Map((usrRes.data ?? []).map((u) => [u.id, u.nome ?? "—"]));
      const papeis = new Map((papRes.data ?? []).map((p) => [p.id, p.nome ?? "—"]));
      const clientes = new Map(
        (ctrRes.data ?? []).map((c) => [c.id, c.cliente_nome ?? "—"])
      );

      const linhasMap: Linha[] = rows.map((r) => ({
        id: r.id,
        usuario_id: r.usuario_id,
        pessoa: nomes.get(r.usuario_id) ?? "—",
        papel: papeis.get(r.papel_id) ?? "—",
        contrato_id: r.contrato_id,
        contrato_cliente: clientes.get(r.contrato_id) ?? "—",
        base_calculo: Number(r.base_calculo ?? 0),
        percentual: Number(r.percentual ?? 0),
        valor: Number(r.valor ?? 0),
        status: r.status ?? "pendente",
        data_gatilho: r.data_gatilho,
        data_pagamento: r.data_pagamento,
      }));
      setLinhas(linhasMap);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar comissões";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, fim, apenasProprio]);

  async function confirmarPago() {
    if (!alvoPagar || processando) return;
    setProcessando(true);
    try {
      const { error } = await supabase
        .from("comissoes")
        .update({ status: "paga", data_pagamento: dataPagamento })
        .eq("id", alvoPagar.id);
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("contrato_logs").insert({
        contrato_id: alvoPagar.contrato_id,
        acao: "comissao_paga",
        titulo: "Comissão paga",
        descricao: `${alvoPagar.pessoa} (${alvoPagar.papel}) — ${fmtBRL(alvoPagar.valor)} pago em ${dataPagamento}.`,
        autor_id: userData.user?.id ?? null,
      });

      toast.success("Comissão marcada como paga");
      setAlvoPagar(null);
      await carregar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao registrar pagamento";
      toast.error(msg);
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarCancelar() {
    if (!alvoCancelar || processando) return;
    setProcessando(true);
    try {
      const { error } = await supabase
        .from("comissoes")
        .update({ status: "cancelada" })
        .eq("id", alvoCancelar.id);
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("contrato_logs").insert({
        contrato_id: alvoCancelar.contrato_id,
        acao: "comissao_cancelada",
        titulo: "Comissão cancelada",
        descricao: `${alvoCancelar.pessoa} (${alvoCancelar.papel}) — ${fmtBRL(alvoCancelar.valor)} cancelada.`,
        autor_id: userData.user?.id ?? null,
      });

      toast.success("Comissão cancelada");
      setAlvoCancelar(null);
      await carregar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao cancelar comissão";
      toast.error(msg);
    } finally {
      setProcessando(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-md px-4 py-12 text-center text-sm text-muted-foreground"
        style={{ background: "#F5F7FA", border: "1px dashed #B0BAC9" }}>
        Carregando comissões…
      </div>
    );
  }

  if (linhas.length === 0) {
    return (
      <div
        className="rounded-md px-4 py-12 text-center"
        style={{ background: "#F5F7FA", border: "1px dashed #B0BAC9" }}
      >
        <p className="text-sm font-medium text-[#0D1117]">Nenhuma comissão no período</p>
        <p className="mt-1 text-xs text-[#6B7A90]">
          Use o botão "Recalcular" no topo da tela para gerar comissões a partir dos contratos.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border" style={{ borderColor: "#E8ECF2" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "#F5F7FA", color: "#6B7A90" }}>
            <tr>
              <th className="px-3 py-2 text-left font-medium">Pessoa</th>
              <th className="px-3 py-2 text-left font-medium">Papel</th>
              <th className="px-3 py-2 text-left font-medium">Contrato</th>
              <th className="px-3 py-2 text-left font-medium">Cliente</th>
              <th className="px-3 py-2 text-right font-medium">Valor base</th>
              <th className="px-3 py-2 text-right font-medium">%</th>
              <th className="px-3 py-2 text-right font-medium">Valor comissão</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Data</th>
              <th className="px-3 py-2 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#E8ECF2" }}>
            {linhas.map((l) => {
              const st = STATUS_STYLE[l.status] ?? STATUS_STYLE.pendente;
              const podeAgir = l.status === "pendente" || l.status === "liberada";
              return (
                <tr key={l.id}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
                        style={{ background: "#1E6FBF" }}
                      >
                        {iniciais(l.pessoa)}
                      </div>
                      <span>{l.pessoa}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{l.papel}</td>
                  <td className="px-3 py-2 font-mono text-xs text-[#6B7A90]">
                    {l.contrato_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">{l.contrato_cliente}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(l.base_calculo)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {Number(l.percentual).toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {fmtBRL(l.valor)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: st.bg, color: st.fg }}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-[#6B7A90]">
                    {fmtData(l.data_gatilho)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {podeAgir && podePagar && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-white hover:opacity-90"
                            style={{ background: "#05873C" }}
                            onClick={() => {
                              setDataPagamento(new Date().toISOString().slice(0, 10));
                              setAlvoPagar(l);
                            }}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Pagar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => setAlvoCancelar(l)}
                          >
                            <X className="mr-1 h-3 w-3" />
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!alvoPagar} onOpenChange={(v) => !v && setAlvoPagar(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
          </DialogHeader>
          {alvoPagar && (
            <div className="space-y-3 text-sm">
              <div className="space-y-1.5 rounded-md p-3" style={{ background: "#F5F7FA" }}>
                <div className="flex justify-between"><span className="text-xs text-[#6B7A90]">Pessoa</span><span>{alvoPagar.pessoa}</span></div>
                <div className="flex justify-between"><span className="text-xs text-[#6B7A90]">Papel</span><span>{alvoPagar.papel}</span></div>
                <div className="flex justify-between"><span className="text-xs text-[#6B7A90]">Cliente</span><span>{alvoPagar.contrato_cliente}</span></div>
                <div className="mt-2 flex items-baseline justify-between border-t pt-2" style={{ borderColor: "#E8ECF2" }}>
                  <span className="text-xs text-[#6B7A90]">Valor</span>
                  <span className="text-xl font-medium tabular-nums" style={{ color: "#12B76A" }}>
                    {fmtBRL(alvoPagar.valor)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Data de pagamento *</label>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  style={{ borderColor: "#E8ECF2" }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvoPagar(null)} disabled={processando}>
              Voltar
            </Button>
            <Button
              onClick={confirmarPago}
              disabled={processando || !dataPagamento}
              className="text-white hover:opacity-90"
              style={{ background: "#12B76A" }}
            >
              <Check className="mr-1 h-4 w-4" />
              {processando ? "Processando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!alvoCancelar} onOpenChange={(v) => !v && setAlvoCancelar(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cancelar comissão</DialogTitle>
          </DialogHeader>
          {alvoCancelar && (
            <p className="text-sm">
              Tem certeza que deseja cancelar a comissão de{" "}
              <span className="font-medium">{alvoCancelar.pessoa}</span> no valor de{" "}
              <span className="font-medium">{fmtBRL(alvoCancelar.valor)}</span>?
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvoCancelar(null)} disabled={processando}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarCancelar}
              disabled={processando}
            >
              {processando ? "Processando…" : "Cancelar comissão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Wallet, AlertCircle, FileText, Receipt, Clock, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MetricTile } from "./SectionCard";
import { Periodo, rangeFromPeriodo, fmtBRL, fmtPct } from "./shared";

const ATIVOS = ["comercial", "tecnico", "producao", "logistica", "montagem", "pos_venda"];

async function fetchResumo(periodo: Periodo, lojaId: string) {
  const { start, end } = rangeFromPeriodo(periodo);
  const hojeISO = new Date().toISOString().slice(0, 10);

  let cQ = supabase
    .from("contratos")
    .select("id, valor_venda, status, data_criacao, loja_id")
    .gte("data_criacao", start.toISOString())
    .lt("data_criacao", end.toISOString())
    .neq("status", "cancelado");
  if (lojaId !== "all") cQ = cQ.eq("loja_id", lojaId);

  let cAtivosQ = supabase.from("contratos").select("id", { count: "exact", head: true }).in("status", ATIVOS);
  if (lojaId !== "all") cAtivosQ = cAtivosQ.eq("loja_id", lojaId);

  let recPagasQ = supabase
    .from("financeiro_contas_receber")
    .select("valor")
    .eq("status", "pago")
    .gte("data_pagamento", start.toISOString().slice(0, 10))
    .lt("data_pagamento", end.toISOString().slice(0, 10));
  if (lojaId !== "all") recPagasQ = recPagasQ.eq("loja_id", lojaId);

  let pagPagasQ = supabase
    .from("financeiro_contas_pagar")
    .select("valor")
    .eq("status", "pago")
    .gte("data_pagamento", start.toISOString().slice(0, 10))
    .lt("data_pagamento", end.toISOString().slice(0, 10));
  if (lojaId !== "all") pagPagasQ = pagPagasQ.eq("loja_id", lojaId);

  let recPendQ = supabase
    .from("financeiro_contas_receber")
    .select("valor, vencimento")
    .eq("status", "pendente");
  if (lojaId !== "all") recPendQ = recPendQ.eq("loja_id", lojaId);

  const [contratos, ativos, recPagas, pagPagas, recPend] = await Promise.all([
    cQ, cAtivosQ, recPagasQ, pagPagasQ, recPendQ,
  ]);

  const contratosArr = contratos.data ?? [];
  const receitaContratada = contratosArr.reduce((s, c) => s + Number(c.valor_venda || 0), 0);
  const numContratos = contratosArr.length;
  const ticketMedio = numContratos ? receitaContratada / numContratos : 0;
  const receitaRecebida = (recPagas.data ?? []).reduce((s, r) => s + Number(r.valor || 0), 0);
  const despesasPagas = (pagPagas.data ?? []).reduce((s, r) => s + Number(r.valor || 0), 0);
  const resultadoLiquido = receitaRecebida - despesasPagas;
  const margemLiq = receitaRecebida > 0 ? (resultadoLiquido / receitaRecebida) * 100 : 0;

  const pendArr = recPend.data ?? [];
  const aReceberAberto = pendArr.reduce((s, r) => s + Number(r.valor || 0), 0);
  const atrasado = pendArr
    .filter((r) => r.vencimento && r.vencimento < hojeISO)
    .reduce((s, r) => s + Number(r.valor || 0), 0);

  return {
    receitaContratada,
    receitaRecebida,
    resultadoLiquido,
    margemLiq,
    aReceberAberto,
    atrasado,
    contratosAtivos: ativos.count ?? 0,
    ticketMedio,
    numContratos,
  };
}

export function VisaoGeralSection({ periodo, lojaId }: { periodo: Periodo; lojaId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-resumo", periodo, lojaId],
    queryFn: () => fetchResumo(periodo, lojaId),
  });

  const d = data;
  const skel = isLoading || !d;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricTile
        label="Receita contratada"
        value={skel ? "—" : fmtBRL(d!.receitaContratada)}
        hint={skel ? "" : `${d!.numContratos} contratos no período`}
        accent="#1E6FBF"
        icon={<FileText className="h-4 w-4" />}
      />
      <MetricTile
        label="Receita recebida"
        value={skel ? "—" : fmtBRL(d!.receitaRecebida)}
        hint="Contas a receber pagas"
        accent="#12B76A"
        icon={<DollarSign className="h-4 w-4" />}
      />
      <MetricTile
        label="Resultado líquido"
        value={skel ? "—" : fmtBRL(d!.resultadoLiquido)}
        hint={skel ? "" : `Margem ${fmtPct(d!.margemLiq, 1)}`}
        accent={d && d.resultadoLiquido >= 0 ? "#12B76A" : "#E53935"}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <MetricTile
        label="Ticket médio"
        value={skel ? "—" : fmtBRL(d!.ticketMedio)}
        accent="#E8A020"
        icon={<Target className="h-4 w-4" />}
      />
      <MetricTile
        label="Contas a receber em aberto"
        value={skel ? "—" : fmtBRL(d!.aReceberAberto)}
        accent="#1E6FBF"
        icon={<Receipt className="h-4 w-4" />}
      />
      <MetricTile
        label="Contas atrasadas"
        value={skel ? "—" : fmtBRL(d!.atrasado)}
        accent="#E53935"
        icon={<AlertCircle className="h-4 w-4" />}
      />
      <MetricTile
        label="Contratos ativos"
        value={skel ? "—" : String(d!.contratosAtivos)}
        hint="Em etapas operacionais"
        accent="#534AB7"
        icon={<Wallet className="h-4 w-4" />}
      />
      <MetricTile
        label="Margem líquida"
        value={skel ? "—" : fmtPct(d!.margemLiq, 1)}
        hint="Resultado / receita recebida"
        accent={d && d.margemLiq >= 15 ? "#12B76A" : "#E8A020"}
        icon={<Clock className="h-4 w-4" />}
      />
    </div>
  );
}

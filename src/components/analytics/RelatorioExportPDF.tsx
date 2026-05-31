import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Periodo, rangeFromPeriodo, fmtBRL } from "./shared";

type Props = { periodo: Periodo; lojaId: string };

async function fetchReportData(periodo: Periodo, lojaId: string) {
  const { start, end } = rangeFromPeriodo(periodo);

  // Contratos
  let cQ = supabase
    .from("contratos")
    .select("id, valor_venda, status, data_criacao, loja_id")
    .gte("data_criacao", start.toISOString())
    .lt("data_criacao", end.toISOString())
    .neq("status", "cancelado");
  if (lojaId !== "all") cQ = cQ.eq("loja_id", lojaId);
  const { data: contratos } = await cQ;
  const list = contratos ?? [];

  const finalizados = list.filter((c) => c.status === "finalizado");
  const faturamento = list.reduce((s, c) => s + Number(c.valor_venda || 0), 0);
  const ticketMedio = list.length ? faturamento / list.length : 0;

  // Margem from vw_contratos_dre
  let mQ = (supabase as any)
    .from("vw_contratos_dre")
    .select("margem_realizada")
    .gte("data_criacao", start.toISOString())
    .lt("data_criacao", end.toISOString());
  if (lojaId !== "all") mQ = mQ.eq("loja_id", lojaId);
  const { data: margemData } = await mQ;
  const margens = (margemData ?? [])
    .map((r: any) => Number(r.margem_realizada))
    .filter((v: number) => Number.isFinite(v) && v !== 0);
  const margemMedia = margens.length ? margens.reduce((a: number, b: number) => a + b, 0) / margens.length : 0;

  // NPS
  const ids = list.map((c) => c.id).filter(Boolean) as string[];
  let nps: number | null = null;
  if (ids.length) {
    const { data: chamados } = await supabase
      .from("chamados_pos_venda")
      .select("nps")
      .in("contrato_id", ids)
      .not("nps", "is", null);
    const notas = (chamados ?? []).map((c: any) => Number(c.nps)).filter((n: number) => Number.isFinite(n));
    nps = notas.length ? notas.reduce((a: number, b: number) => a + b, 0) / notas.length : null;
  }

  // Financeiro
  let recQ = supabase
    .from("financeiro_contas_receber")
    .select("valor")
    .eq("status", "pago")
    .gte("data_pagamento", start.toISOString().slice(0, 10))
    .lt("data_pagamento", end.toISOString().slice(0, 10));
  if (lojaId !== "all") recQ = recQ.eq("loja_id", lojaId);

  let pagQ = supabase
    .from("financeiro_contas_pagar")
    .select("valor")
    .eq("status", "pago")
    .gte("data_pagamento", start.toISOString().slice(0, 10))
    .lt("data_pagamento", end.toISOString().slice(0, 10));
  if (lojaId !== "all") pagQ = pagQ.eq("loja_id", lojaId);

  const [recRes, pagRes] = await Promise.all([recQ, pagQ]);
  const receita = (recRes.data ?? []).reduce((s, r) => s + Number(r.valor || 0), 0);
  const despesas = (pagRes.data ?? []).reduce((s, r) => s + Number(r.valor || 0), 0);
  const resultado = receita - despesas;

  // Operacional - montagens
  let montQ = (supabase as any)
    .from("montagens")
    .select("id, status, data_inicio, data_conclusao")
    .gte("data_inicio", start.toISOString().slice(0, 10))
    .lt("data_inicio", end.toISOString().slice(0, 10));
  if (lojaId !== "all") montQ = montQ.eq("loja_id", lojaId);
  const { data: montagens } = await montQ;
  const montList = montagens ?? [];
  const montConcluidas = montList.filter((m: any) => m.status === "concluida");
  const tempos = montConcluidas
    .filter((m: any) => m.data_inicio && m.data_conclusao)
    .map((m: any) => {
      const d1 = new Date(m.data_inicio).getTime();
      const d2 = new Date(m.data_conclusao).getTime();
      return (d2 - d1) / (1000 * 60 * 60 * 24);
    })
    .filter((d: number) => d > 0 && d < 365);
  const tempoMedio = tempos.length ? tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length : 0;

  return {
    faturamento,
    contratosTotal: list.length,
    contratosFechados: finalizados.length,
    ticketMedio,
    margemMedia,
    nps,
    receita,
    despesas,
    resultado,
    montagensTotal: montList.length,
    montagensConcluidas: montConcluidas.length,
    tempoMedioDias: tempoMedio,
  };
}

export function RelatorioExportPDF({ periodo, lojaId }: Props) {
  const [generating, setGenerating] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-report-pdf", periodo, lojaId],
    queryFn: () => fetchReportData(periodo, lojaId),
    enabled: false,
  });

  const handleExport = async () => {
    setGenerating(true);
    try {
      const reportData = await fetchReportData(periodo, lojaId);
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const { label } = rangeFromPeriodo(periodo);
      const today = new Date().toLocaleDateString("pt-BR");

      let y = 20;
      const lineHeight = 7;
      const sectionGap = 12;

      // Header
      doc.setFontSize(16);
      doc.setTextColor(13, 17, 23);
      doc.text("Relatorio Gerencial", 14, y);
      y += 8;
      doc.setFontSize(11);
      doc.setTextColor(107, 122, 144);
      doc.text(`Periodo: ${label} | Gerado em: ${today}`, 14, y);
      y += sectionGap;

      // Section 1: KPIs Resumo
      doc.setFontSize(13);
      doc.setTextColor(13, 17, 23);
      doc.text("1. KPIs Resumo", 14, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`Faturamento: ${fmtBRL(reportData.faturamento)}`, 18, y); y += lineHeight;
      doc.text(`Contratos no periodo: ${reportData.contratosTotal}`, 18, y); y += lineHeight;
      doc.text(`Margem media: ${reportData.margemMedia.toFixed(1)}%`, 18, y); y += lineHeight;
      doc.text(`NPS medio: ${reportData.nps != null ? reportData.nps.toFixed(1) : "N/A"}`, 18, y); y += sectionGap;

      // Section 2: Comercial
      doc.setFontSize(13);
      doc.setTextColor(13, 17, 23);
      doc.text("2. Comercial", 14, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`Contratos fechados: ${reportData.contratosFechados}`, 18, y); y += lineHeight;
      doc.text(`Valor total: ${fmtBRL(reportData.faturamento)}`, 18, y); y += lineHeight;
      doc.text(`Ticket medio: ${fmtBRL(reportData.ticketMedio)}`, 18, y); y += sectionGap;

      // Section 3: Financeiro
      doc.setFontSize(13);
      doc.setTextColor(13, 17, 23);
      doc.text("3. Financeiro", 14, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`Receita recebida: ${fmtBRL(reportData.receita)}`, 18, y); y += lineHeight;
      doc.text(`Despesas pagas: ${fmtBRL(reportData.despesas)}`, 18, y); y += lineHeight;
      doc.text(`Resultado liquido: ${fmtBRL(reportData.resultado)}`, 18, y); y += sectionGap;

      // Section 4: Operacional
      doc.setFontSize(13);
      doc.setTextColor(13, 17, 23);
      doc.text("4. Operacional", 14, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`Montagens no periodo: ${reportData.montagensTotal}`, 18, y); y += lineHeight;
      doc.text(`Montagens concluidas: ${reportData.montagensConcluidas}`, 18, y); y += lineHeight;
      doc.text(`Tempo medio (dias): ${reportData.tempoMedioDias.toFixed(1)}`, 18, y);

      doc.save(`relatorio_gerencial_${periodo}_${today.replace(/\//g, "-")}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={generating}
      className="gap-2"
      style={{ borderColor: "#E8ECF2" }}
    >
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {generating ? "Gerando..." : "Exportar PDF"}
    </Button>
  );
}

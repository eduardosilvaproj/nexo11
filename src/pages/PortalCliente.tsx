import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2Off, ArrowRight, CheckCircle2, FileText, Download, Check } from "lucide-react";
import { LogoNexo } from "@/components/LogoNexo";
import { ContratoStepper } from "@/components/contrato/ContratoStepper";
import { pdf } from "@react-pdf/renderer";
import { ContractPDF } from "@/components/contrato/ContractPDF";
import { Button } from "@/components/ui/button";

const PUBLIC_EVENTS: Record<
  string,
  { mensagem: (log: any) => string; tipo: "avancado" | "concluido" }
> = {
  status_avancado: {
    tipo: "avancado",
    mensagem: (log) =>
      `Seu pedido avançou para ${log.descricao || log.titulo || "a próxima etapa"}`,
  },
  producao_concluida: {
    tipo: "concluido",
    mensagem: () => "Seu pedido saiu para produção",
  },
  logistica_confirmada: {
    tipo: "concluido",
    mensagem: () => "Entrega realizada com sucesso",
  },
  checklist_tecnico_completo: {
    tipo: "concluido",
    mensagem: () => "Projeto validado pela equipe técnica",
  },
};

const fmtDateLong = (d?: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STAGE_LABELS: Record<string, string> = {
  comercial: "Comercial",
  tecnico: "Técnico",
  producao: "Produção",
  logistica: "Logística",
  montagem: "Montagem",
  pos_venda: "Pós-venda",
  finalizado: "Finalizado",
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";

export default function PortalCliente() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contrato, setContrato] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [vendedorNome, setVendedorNome] = useState<string | null>(null);
  const [entregaPrevista, setEntregaPrevista] = useState<string | null>(null);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  const [npsRespondido, setNpsRespondido] = useState(false);
  const [npsNota, setNpsNota] = useState<number | null>(null);
  const [npsComentario, setNpsComentario] = useState("");
  const [npsSubmitting, setNpsSubmitting] = useState(false);
  const [signing, setSigning] = useState(false);

  const portalClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: token ? { "x-portal-token": token } : {},
      },
    },
  );

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: c, error: cErr }, { data: l }, { data: chs }, { data: ents }, { data: orcs }, { data: trs }, { data: ambs }] =
        await Promise.all([
          portalClient
            .from("contratos")
            .select("*, lojas(*)")
            .limit(1)
            .maybeSingle(),
          portalClient
            .from("contrato_logs")
            .select("*")
            .order("created_at", { ascending: false }),
          portalClient
            .from("chamados_pos_venda")
            .select("nps")
            .not("nps", "is", null)
            .limit(1),
          portalClient
            .from("entregas")
            .select("data_prevista")
            .not("data_prevista", "is", null)
            .order("data_prevista", { ascending: true })
            .limit(1),
          portalClient
            .from("orcamentos")
            .select("id, nome, status, valor_negociado, total_pedido, parcelas, parcelas_datas, created_at")
            .order("created_at", { ascending: false }),
          portalClient
            .from("transacoes")
            .select("id, descricao, valor, data_vencimento, data_pagamento, status, tipo")
            .eq("tipo", "receita")
            .order("data_vencimento", { ascending: true }),
          portalClient
            .from("contrato_ambientes")
            .select("*"),
        ]);

      if (cErr || !c) {
        setError("Link inválido ou expirado.");
        return;
      }

      setContrato(c);
      setLogs(l ?? []);
      setOrcamentos(orcs ?? []);
      setAmbientes(ambs ?? []);

      // Parcelas: prioridade transações → orcamento.parcelas_datas → orcamento.parcelas+valor
      let parcelasFinal: any[] = trs ?? [];
      if (parcelasFinal.length === 0 && orcs && orcs.length > 0) {
        const orc: any = orcs[0];
        const datas = Array.isArray(orc.parcelas_datas) ? orc.parcelas_datas : [];
        if (datas.length > 0) {
          parcelasFinal = datas.map((d: any, i: number) => ({
            id: `pd-${i}`,
            data_vencimento: d.data ?? d.vencimento ?? d,
            valor: Number(d.valor ?? 0),
            status: d.pago ? "pago" : "pendente",
          }));
        } else if (orc.parcelas && Number(orc.parcelas) > 0) {
          const n = Number(orc.parcelas);
          const total = Number(orc.valor_negociado ?? orc.total_pedido ?? 0);
          const valorParc = total > 0 ? total / n : 0;
          const base = new Date();
          parcelasFinal = Array.from({ length: n }, (_, i) => {
            const d = new Date(base);
            d.setMonth(d.getMonth() + i);
            return {
              id: `calc-${i}`,
              data_vencimento: d.toISOString().slice(0, 10),
              valor: valorParc,
              status: "pendente",
            };
          });
        }
      }
      setParcelas(parcelasFinal);
      setNpsRespondido((chs ?? []).length > 0);
      setEntregaPrevista((ents?.[0] as any)?.data_prevista ?? null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  async function handleOrcamentoStatus(orcId: string, novoStatus: "aprovado" | "recusado") {
    try {
      const { error } = await portalClient
        .from("orcamentos")
        .update({ status: novoStatus })
        .eq("id", orcId);
      if (error) throw error;
      toast.success(novoStatus === "aprovado" ? "Orçamento aprovado!" : "Orçamento recusado");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível atualizar");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleSubmitNps() {
    if (npsNota === null || !token) return;
    setNpsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc(
        "portal_registrar_nps" as any,
        {
          _token: token,
          _nota: npsNota,
          _comentario: npsComentario || null,
        }
      );
      if (error) throw error;
      const r = data as { ok: boolean; erro?: string };
      if (!r?.ok) throw new Error(r?.erro ?? "Erro ao enviar");
      toast.success("Obrigado pela sua avaliação!");
      setNpsRespondido(true);
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível enviar");
    } finally {
      setNpsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F5F7FA" }}
      >
        <div className="text-sm" style={{ color: "#6B7A90" }}>
          Carregando…
        </div>
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div
        className="min-h-screen flex flex-col items-center"
        style={{ backgroundColor: "#F5F7FA" }}
      >
        <div
          className="w-full flex justify-center py-8"
          style={{ backgroundColor: "#0D1117" }}
        >
          <LogoNexo size="lg" />
        </div>
        <div className="flex-1 w-full flex items-center justify-center px-6">
          <div
            className="bg-white rounded-xl shadow-sm p-8 text-center"
            style={{ width: 400, maxWidth: "100%" }}
          >
            <Link2Off className="mx-auto mb-4" size={24} color="#B0BAC9" />
            <h1 style={{ fontSize: 18, fontWeight: 500, color: "#0D1117" }}>
              Link inválido ou expirado
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "#6B7A90",
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              Este link de acompanhamento não é mais válido.
              <br />
              Entre em contato com a loja para obter um novo link.
            </p>
          </div>
        </div>
        <footer className="py-6" style={{ fontSize: 12, color: "#B0BAC9" }}>
          NEXO · Gestão de Planejados
        </footer>
      </div>
    );
  }

  const numero = "#" + contrato.id.slice(0, 8).toUpperCase();
  const isFinalizado = contrato.status === "finalizado";
  const stageLabel = STAGE_LABELS[contrato.status] ?? contrato.status;

  return (
    <div
      className="portal-root min-h-screen flex flex-col"
      style={{ backgroundColor: "#F5F7FA" }}
    >
      <style>{`
        .portal-current-stage { display: none; }
        @media (max-width: 480px) {
          .portal-root .portal-header { padding: 16px !important; }
          .portal-root .portal-header-inner {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 8px !important;
          }
          .portal-root .portal-header-right { text-align: center !important; align-items: center !important; }
          .portal-root .portal-main { padding-left: 12px !important; padding-right: 12px !important; }
          .portal-root .portal-card { padding: 16px !important; max-width: 100% !important; margin-top: 16px !important; }
          .portal-root .portal-status-card { flex-direction: column !important; align-items: stretch !important; }
          .portal-root .portal-status-right { text-align: left !important; }
          .portal-root .portal-stepper > div { padding: 12px 8px !important; }
          .portal-root .portal-stepper .h-8.w-8 { height: 24px !important; width: 24px !important; }
          .portal-root .portal-stepper .h-8.w-8 svg { width: 12px !important; height: 12px !important; }
          .portal-root .portal-stepper span.mt-2 { display: none !important; }
          .portal-root .portal-current-stage { display: block !important; }
          .portal-root .portal-nps-grid { display: grid !important; grid-template-columns: repeat(5, 1fr) !important; gap: 6px !important; }
          .portal-root .portal-nps-grid > button { width: 100% !important; height: 44px !important; }
        }
      `}</style>

      {/* 1. Header público */}
      <header className="portal-header" style={{ backgroundColor: "#0D1117", padding: "20px 32px" }}>
        <div className="portal-header-inner max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-1 items-start">
            <LogoNexo size="lg" />
            <div style={{ fontSize: 12, color: "#6B7A90" }}>
              Acompanhamento de pedido
            </div>
          </div>
          <div className="portal-header-right text-right flex flex-col gap-1">
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>
              {contrato.lojas?.nome ?? numero}
            </div>
            <div style={{ fontSize: 12, color: "#6B7A90" }}>
              {contrato.lojas?.cidade && contrato.lojas?.estado
                ? `${contrato.lojas.cidade} · ${contrato.lojas.estado}`
                : numero}
            </div>
          </div>
        </div>
      </header>

      <main className="portal-main flex-1 max-w-3xl w-full mx-auto px-6 py-8 space-y-6">
        {/* 2. Status atual — card de destaque */}
        <section
          className="portal-card portal-status-card bg-white rounded-xl mx-auto flex items-center justify-between gap-6 flex-wrap"
          style={{
            border: "0.5px solid #E8ECF2",
            padding: 24,
            marginTop: 32,
            maxWidth: 680,
          }}
        >
          <div className="flex flex-col gap-2">
            <div style={{ fontSize: 20, fontWeight: 500, color: "#0D1117" }}>
              Olá, {contrato.cliente_nome}
            </div>
            <div style={{ fontSize: 14, color: "#6B7A90" }}>
              {isFinalizado
                ? "Seu pedido foi finalizado"
                : "Seu pedido está em andamento"}
            </div>
            <div className="mt-2">
              <span
                className="inline-block rounded-full"
                style={{
                  padding: "8px 20px",
                  fontSize: 14,
                  fontWeight: 500,
                  backgroundColor: isFinalizado ? "#E8F8EF" : "#E8F0FB",
                  color: isFinalizado ? "#05873C" : "#1E6FBF",
                }}
              >
                {isFinalizado ? "Finalizado" : stageLabel}
              </span>
            </div>
            {entregaPrevista && !isFinalizado && (
              <div style={{ fontSize: 13, color: "#6B7A90", marginTop: 4 }}>
                Previsão:{" "}
                {new Date(entregaPrevista).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            )}
          </div>
          <div className="portal-status-right flex flex-col gap-1 text-right">
            <div style={{ fontSize: 12, color: "#6B7A90" }}>
              Contrato
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#0D1117" }}>
              {numero}
            </div>
          </div>
        </section>

        {/* 3. Barra de progresso das etapas — reutiliza componente interno */}
        <section className="portal-stepper mx-auto w-full" style={{ maxWidth: 680 }}>
          <ContratoStepper current={contrato.status} />
          <div
            className="portal-current-stage text-center"
            style={{ fontSize: 13, fontWeight: 500, color: "#1E6FBF", marginTop: 8 }}
          >
            Etapa atual: {stageLabel}
          </div>
        </section>

        {/* 4. Detalhes do pedido */}
        <section
          className="portal-card bg-white rounded-xl mx-auto w-full"
          style={{ maxWidth: 680, border: "0.5px solid #E8ECF2", padding: 24 }}
        >

          <h2 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117", marginBottom: 16 }}>
            Detalhes do pedido
          </h2>
          <dl className="divide-y" style={{ borderColor: "#E8ECF2" }}>
            {[
              { label: "Cliente", value: contrato.cliente_nome },
              {
                label: "Data de assinatura",
                value: fmtDate(contrato.data_criacao),
              },
              {
                label: "Previsão de entrega",
                value: entregaPrevista ? fmtDate(entregaPrevista) : "A definir",
              },
              {
                label: "Loja",
                value: contrato.lojas?.nome
                  ? `${contrato.lojas.nome}${contrato.lojas.cidade ? " — " + contrato.lojas.cidade : ""}`
                  : "—",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-3"
              >
                <dt style={{ fontSize: 13, color: "#6B7A90" }}>{row.label}</dt>
                <dd
                  style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}
                  className="text-right"
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 4.5 Orçamentos do cliente */}
        {orcamentos.length > 0 && (
          <section
            className="portal-card bg-white rounded-xl mx-auto w-full"
            style={{ maxWidth: 680, border: "0.5px solid #E8ECF2", padding: 24 }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117", marginBottom: 16 }}>
              Orçamentos
            </h2>
            <div className="space-y-3">
              {orcamentos.map((o) => {
                const valor = Number(o.valor_negociado || o.total_pedido || 0);
                const status = (o.status as string) || "rascunho";
                const sMap: Record<string, { label: string; bg: string; fg: string }> = {
                  rascunho: { label: "Rascunho", bg: "#E8ECF2", fg: "#6B7A90" },
                  enviado: { label: "Enviado", bg: "#E6F3FF", fg: "#1E6FBF" },
                  aprovado: { label: "Aprovado", bg: "#D1FAE5", fg: "#05873C" },
                  recusado: { label: "Recusado", bg: "#FDECEA", fg: "#E53935" },
                };
                const s = sMap[status] ?? sMap.rascunho;
                const podeAcao = status === "enviado";
                return (
                  <div
                    key={o.id}
                    className="rounded-lg flex items-center justify-between gap-3 flex-wrap"
                    style={{ border: "1px solid #E8ECF2", padding: 16 }}
                  >
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
                        {o.nome || "Orçamento"}
                      </div>
                      <div style={{ fontSize: 13, color: "#6B7A90", marginTop: 2 }}>
                        {valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                    </div>
                    <span
                      className="rounded-full"
                      style={{
                        padding: "4px 12px",
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: s.bg,
                        color: s.fg,
                      }}
                    >
                      {s.label}
                    </span>
                    {podeAcao && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleOrcamentoStatus(o.id, "aprovado")}
                          className="rounded-md flex-1 sm:flex-none"
                          style={{
                            backgroundColor: "#12B76A",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 500,
                            padding: "8px 14px",
                          }}
                        >
                          ✅ Aprovar
                        </button>
                        <button
                          onClick={() => handleOrcamentoStatus(o.id, "recusado")}
                          className="rounded-md flex-1 sm:flex-none"
                          style={{
                            backgroundColor: "#fff",
                            color: "#E53935",
                            border: "1px solid #E53935",
                            fontSize: 13,
                            fontWeight: 500,
                            padding: "8px 14px",
                          }}
                        >
                          ❌ Recusar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. Timeline de atividades — eventos públicos */}
        <section
          className="portal-card bg-white rounded-xl mx-auto w-full"
          style={{ maxWidth: 680, border: "0.5px solid #E8ECF2", padding: 24 }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117", marginBottom: 16 }}>
            Histórico do pedido
          </h2>
          {(() => {
            const publicLogs = logs.filter((l) => PUBLIC_EVENTS[l.acao]);
            if (publicLogs.length === 0) {
              return (
                <div style={{ fontSize: 14, color: "#6B7A90" }}>
                  Seu pedido foi registrado. Em breve teremos atualizações.
                </div>
              );
            }
            return (
              <ol className="space-y-4">
                {publicLogs.map((log) => {
                  const cfg = PUBLIC_EVENTS[log.acao];
                  const isConcluido = cfg.tipo === "concluido";
                  const Icon = isConcluido ? CheckCircle2 : ArrowRight;
                  const color = isConcluido ? "#12B76A" : "#1E6FBF";
                  return (
                    <li key={log.id} className="flex items-start gap-3">
                      <div
                        className="rounded-full flex items-center justify-center shrink-0"
                        style={{
                          width: 32,
                          height: 32,
                          backgroundColor: `${color}1A`,
                          color,
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
                          {cfg.mensagem(log)}
                          {isConcluido && " ✓"}
                        </div>
                        <div style={{ fontSize: 12, color: "#6B7A90", marginTop: 2 }}>
                          {fmtDateLong(log.created_at)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            );
          })()}
        </section>

        {/* 5.5 Pagamentos / parcelas */}
        {(() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const totalPago = parcelas
            .filter((p) => p.status === "pago")
            .reduce((s, p) => s + Number(p.valor || 0), 0);
          const totalAberto = parcelas
            .filter((p) => p.status !== "pago" && p.status !== "cancelado")
            .reduce((s, p) => s + Number(p.valor || 0), 0);
          const fmtBRL = (n: number) =>
            n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          if (parcelas.length === 0) {
            return (
              <section
                className="portal-card bg-white rounded-xl mx-auto w-full"
                style={{ maxWidth: 680, border: "0.5px solid #E8ECF2", padding: 24 }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117", marginBottom: 16 }}>
                  Pagamentos
                </h2>
                <p style={{ fontSize: 13, color: "#6B7A90", textAlign: "center", padding: "16px 0" }}>
                  Nenhuma parcela cadastrada para este contrato
                </p>
              </section>
            );
          }
          return (
            <section
              className="portal-card bg-white rounded-xl mx-auto w-full"
              style={{ maxWidth: 680, border: "0.5px solid #E8ECF2", padding: 24 }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117", marginBottom: 16 }}>
                Pagamentos
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E8ECF2" }}>
                      <th className="text-left py-2" style={{ fontSize: 12, color: "#6B7A90", fontWeight: 500 }}>Nº</th>
                      <th className="text-left py-2" style={{ fontSize: 12, color: "#6B7A90", fontWeight: 500 }}>Vencimento</th>
                      <th className="text-right py-2" style={{ fontSize: 12, color: "#6B7A90", fontWeight: 500 }}>Valor</th>
                      <th className="text-right py-2" style={{ fontSize: 12, color: "#6B7A90", fontWeight: 500 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcelas.map((p, i) => {
                      const venc = p.data_vencimento ? new Date(p.data_vencimento) : null;
                      const isPago = p.status === "pago";
                      const isAtrasado = !isPago && venc && venc < today;
                      const label = isPago ? "Pago ✅" : isAtrasado ? "Atrasado 🔴" : "Pendente ⏳";
                      const color = isPago ? "#05873C" : isAtrasado ? "#E53935" : "#E8A020";
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #F1F4F8" }}>
                          <td className="py-3" style={{ fontSize: 13, color: "#0D1117" }}>{i + 1}</td>
                          <td className="py-3" style={{ fontSize: 13, color: "#0D1117" }}>
                            {venc ? venc.toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="py-3 text-right tabular-nums" style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>
                            {fmtBRL(Number(p.valor || 0))}
                          </td>
                          <td className="py-3 text-right" style={{ fontSize: 13, color, fontWeight: 500 }}>
                            {label}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div
                className="flex items-center justify-between mt-4 pt-4"
                style={{ borderTop: "1px solid #E8ECF2", flexWrap: "wrap", gap: 12 }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "#6B7A90" }}>Total pago</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#05873C" }}>{fmtBRL(totalPago)}</div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: 12, color: "#6B7A90" }}>Total em aberto</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#E8A020" }}>{fmtBRL(totalAberto)}</div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* 6. NPS — coleta pública (somente pos_venda ou finalizado) */}
        {(contrato.status === "pos_venda" || contrato.status === "finalizado") && (
          npsRespondido ? (
            <section
              className="portal-card rounded-xl mx-auto w-full text-center"
              style={{
                maxWidth: 680,
                backgroundColor: "#F0FDF9",
                border: "1px solid #12B76A",
                padding: 20,
                fontSize: 14,
                fontWeight: 500,
                color: "#05873C",
              }}
            >
              Avaliação registrada — obrigado! ★
            </section>
          ) : (
            <NpsCard
              nota={npsNota}
              setNota={setNpsNota}
              comentario={npsComentario}
              setComentario={setNpsComentario}
              onSubmit={handleSubmitNps}
              submitting={npsSubmitting}
            />
          )
        )}
      </main>

      {/* 7. Rodapé */}
      <footer
        className="text-center"
        style={{ backgroundColor: "#0D1117", padding: "20px 32px", marginTop: 32 }}
      >
        <div style={{ fontSize: 13, color: "#fff" }}>
          NEXO · Gestão de Planejados
        </div>
        <div style={{ fontSize: 11, color: "#6B7A90", marginTop: 4 }}>
          Este link é exclusivo para acompanhamento do seu pedido
        </div>
      </footer>
    </div>
  );
}

function rangeColors(n: number) {
  if (n <= 6) return { bg: "#FDECEA", border: "#E53935", text: "#E53935", fill: "#E53935" };
  if (n <= 8) return { bg: "#FEF3C7", border: "#E8A020", text: "#E8A020", fill: "#E8A020" };
  return { bg: "#D1FAE5", border: "#12B76A", text: "#05873C", fill: "#12B76A" };
}

function NpsCard({
  nota,
  setNota,
  comentario,
  setComentario,
  onSubmit,
  submitting,
}: {
  nota: number | null;
  setNota: (n: number) => void;
  comentario: string;
  setComentario: (c: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <section
      className="portal-card rounded-xl mx-auto w-full"
      style={{
        maxWidth: 680,
        backgroundColor: "#F0FDF9",
        border: "1px solid #12B76A",
        padding: 24,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "#0D1117" }}>
        Como foi a sua experiência?
      </h2>
      <p style={{ fontSize: 13, color: "#6B7A90", marginTop: 4, marginBottom: 20 }}>
        Sua opinião ajuda a melhorarmos o atendimento
      </p>

      <div className="portal-nps-grid flex gap-2 flex-wrap">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => {
          const selected = nota === n;
          const isHover = hover === n;
          const c = rangeColors(n);
          let bg = "#F5F7FA";
          let border = "#E8ECF2";
          let text = "#6B7A90";
          if (selected) {
            bg = c.fill;
            border = c.fill;
            text = "#fff";
          } else if (isHover) {
            bg = c.bg;
            border = c.border;
            text = c.text;
          }
          return (
            <button
              key={n}
              onClick={() => setNota(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              className="rounded-md transition-colors"
              style={{
                width: 40,
                height: 40,
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: bg,
                border: `1px solid ${border}`,
                color: text,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between mt-2" style={{ fontSize: 12, color: "#B0BAC9" }}>
        <span>Muito insatisfeito</span>
        <span>Muito satisfeito</span>
      </div>

      {nota !== null && (
        <div className="mt-5" style={{ animation: "fadeIn 0.3s ease-in-out" }}>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Conte mais sobre sua experiência (opcional)"
            rows={3}
            className="w-full rounded-md p-3"
            style={{
              fontSize: 13,
              border: "1px solid #E8ECF2",
              backgroundColor: "#fff",
              color: "#0D1117",
              resize: "vertical",
            }}
          />
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-md transition-opacity disabled:opacity-50 mt-4"
            style={{
              backgroundColor: "#12B76A",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              padding: "10px 20px",
            }}
          >
            {submitting ? "Enviando…" : "Enviar avaliação"}
          </button>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </section>
  );
}

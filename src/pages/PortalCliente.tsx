import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Link2Off,
  Package,
  Truck,
  Wrench,
  Headphones,
  FileText,
} from "lucide-react";
import { LogoNexo } from "@/components/LogoNexo";

const STAGES = [
  { key: "comercial", label: "Comercial", icon: FileText },
  { key: "tecnico", label: "Técnico", icon: Wrench },
  { key: "producao", label: "Produção", icon: Package },
  { key: "logistica", label: "Logística", icon: Truck },
  { key: "montagem", label: "Montagem", icon: Wrench },
  { key: "pos_venda", label: "Pós-venda", icon: Headphones },
  { key: "finalizado", label: "Finalizado", icon: Check },
];

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
  const [vendedorNome, setVendedorNome] = useState<string | null>(null);
  const [entregaPrevista, setEntregaPrevista] = useState<string | null>(null);
  const [npsRespondido, setNpsRespondido] = useState(false);
  const [npsNota, setNpsNota] = useState<number | null>(null);
  const [npsComentario, setNpsComentario] = useState("");
  const [npsSubmitting, setNpsSubmitting] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { data: tk, error: tkErr } = await supabase
        .from("portal_tokens" as any)
        .select("contrato_id, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (tkErr) throw tkErr;
      if (!tk) {
        setError("Link inválido ou expirado.");
        return;
      }
      if (new Date((tk as any).expires_at) < new Date()) {
        setError("Este link expirou. Solicite um novo à sua loja.");
        return;
      }
      const cid = (tk as any).contrato_id;

      const [{ data: c, error: cErr }, { data: l }, { data: chs }, { data: ents }] =
        await Promise.all([
          supabase.from("contratos").select("*, lojas(nome, cidade, estado)").eq("id", cid).maybeSingle(),
          supabase
            .from("contrato_logs")
            .select("*")
            .eq("contrato_id", cid)
            .order("created_at", { ascending: false }),
          supabase
            .from("chamados_pos_venda")
            .select("nps")
            .eq("contrato_id", cid)
            .not("nps", "is", null)
            .limit(1),
          supabase
            .from("entregas")
            .select("data_prevista")
            .eq("contrato_id", cid)
            .not("data_prevista", "is", null)
            .order("data_prevista", { ascending: true })
            .limit(1),
        ]);
      if (cErr) throw cErr;
      setContrato(c);
      setLogs(l ?? []);
      setNpsRespondido((chs ?? []).length > 0);
      setEntregaPrevista((ents?.[0] as any)?.data_prevista ?? null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
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

  const currentIdx = STAGES.findIndex((s) => s.key === contrato.status);
  const numero = "#" + contrato.id.slice(0, 8).toUpperCase();
  const isFinalizado = contrato.status === "finalizado";
  const stageLabel =
    STAGES.find((s) => s.key === contrato.status)?.label ?? contrato.status;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F5F7FA" }}
    >
      {/* 1. Header público */}
      <header style={{ backgroundColor: "#0D1117", padding: "20px 32px" }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <LogoNexo size="lg" />
            <div style={{ fontSize: 12, color: "#6B7A90" }}>
              Acompanhamento de pedido
            </div>
          </div>
          <div className="text-right flex flex-col gap-1">
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

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 space-y-6">
        {/* 2. Status atual — card de destaque */}
        <section
          className="bg-white rounded-xl mx-auto flex items-center justify-between gap-6 flex-wrap"
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
          <div className="flex flex-col gap-2 text-right">
            <div style={{ fontSize: 12, color: "#6B7A90" }}>
              Contrato {numero}
            </div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#0D1117" }}>
              {Number(contrato.valor_venda ?? 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
        </section>

        {/* 3. Barra de progresso das etapas */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0D1117",
              marginBottom: 20,
            }}
          >
            Progresso do pedido
          </h2>
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              const done = i < currentIdx || isFinalizado;
              const active = i === currentIdx && !isFinalizado;
              const color = done ? "#12B76A" : active ? "#1E6FBF" : "#CBD5E1";
              return (
                <div
                  key={s.key}
                  className="flex flex-col items-center"
                  style={{ minWidth: 72 }}
                >
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: done || active ? color : "#F1F5F9",
                      color: done || active ? "#fff" : "#94A3B8",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div
                    className="text-center"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      marginTop: 8,
                      color: done || active ? "#0D1117" : "#94A3B8",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Detalhes do contrato */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0D1117",
              marginBottom: 16,
            }}
          >
            Detalhes do contrato
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt
                className="uppercase tracking-wide"
                style={{ fontSize: 11, color: "#6B7A90" }}
              >
                Cliente
              </dt>
              <dd style={{ fontWeight: 500, marginTop: 4, color: "#0D1117" }}>
                {contrato.cliente_nome}
              </dd>
            </div>
            <div>
              <dt
                className="uppercase tracking-wide"
                style={{ fontSize: 11, color: "#6B7A90" }}
              >
                Contrato
              </dt>
              <dd style={{ fontWeight: 500, marginTop: 4, color: "#0D1117" }}>
                {numero}
              </dd>
            </div>
            <div>
              <dt
                className="uppercase tracking-wide"
                style={{ fontSize: 11, color: "#6B7A90" }}
              >
                Aberto em
              </dt>
              <dd style={{ fontWeight: 500, marginTop: 4, color: "#0D1117" }}>
                {fmtDate(contrato.data_criacao)}
              </dd>
            </div>
            <div>
              <dt
                className="uppercase tracking-wide"
                style={{ fontSize: 11, color: "#6B7A90" }}
              >
                Etapa atual
              </dt>
              <dd style={{ fontWeight: 500, marginTop: 4, color: "#0D1117" }}>
                {stageLabel}
              </dd>
            </div>
          </dl>
        </section>

        {/* 5. Timeline */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0D1117",
              marginBottom: 20,
            }}
          >
            Histórico do pedido
          </h2>
          {logs.length === 0 ? (
            <div style={{ fontSize: 14, color: "#6B7A90" }}>
              Nenhuma movimentação registrada ainda.
            </div>
          ) : (
            <ol
              className="relative ml-2 space-y-5"
              style={{ borderLeft: "2px solid #E8ECF2" }}
            >
              {logs.map((log) => (
                <li key={log.id} className="ml-5 relative">
                  <span
                    className="absolute rounded-full"
                    style={{
                      left: -27,
                      top: 4,
                      width: 12,
                      height: 12,
                      backgroundColor: "#1E6FBF",
                    }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#0D1117",
                        }}
                      >
                        {log.titulo}
                      </div>
                      {log.descricao && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6B7A90",
                            marginTop: 2,
                          }}
                        >
                          {log.descricao}
                        </div>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-1 whitespace-nowrap"
                      style={{ fontSize: 11, color: "#6B7A90" }}
                    >
                      <Clock size={12} />
                      {fmtDateTime(log.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* 6. NPS — somente se ainda não respondido */}
        {!npsRespondido && (
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0D1117",
                marginBottom: 6,
              }}
            >
              Como foi sua experiência?
            </h2>
            <p style={{ fontSize: 13, color: "#6B7A90", marginBottom: 16 }}>
              De 0 a 10, qual a chance de você nos recomendar?
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => {
                const selected = npsNota === n;
                return (
                  <button
                    key={n}
                    onClick={() => setNpsNota(n)}
                    className="rounded-md transition-colors"
                    style={{
                      width: 40,
                      height: 40,
                      fontSize: 14,
                      fontWeight: 500,
                      border: `1px solid ${selected ? "#1E6FBF" : "#E8ECF2"}`,
                      backgroundColor: selected ? "#1E6FBF" : "#fff",
                      color: selected ? "#fff" : "#0D1117",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <textarea
              value={npsComentario}
              onChange={(e) => setNpsComentario(e.target.value)}
              placeholder="Deixe um comentário (opcional)"
              rows={3}
              className="w-full rounded-md p-3 mb-4"
              style={{
                fontSize: 13,
                border: "1px solid #E8ECF2",
                color: "#0D1117",
                resize: "vertical",
              }}
            />
            <button
              onClick={handleSubmitNps}
              disabled={npsNota === null || npsSubmitting}
              className="rounded-md transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: "#1E6FBF",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                padding: "10px 20px",
              }}
            >
              {npsSubmitting ? "Enviando…" : "Enviar avaliação"}
            </button>
          </section>
        )}
      </main>

      {/* 7. Rodapé */}
      <footer
        className="text-center py-6"
        style={{ fontSize: 12, color: "#B0BAC9" }}
      >
        NEXO · Gestão de Planejados
      </footer>
    </div>
  );
}

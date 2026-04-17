import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, Clock, AlertCircle, Package, Truck, Wrench, Headphones, FileText } from "lucide-react";

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

  useEffect(() => {
    let cancelled = false;
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

        const [{ data: c, error: cErr }, { data: l }] = await Promise.all([
          supabase.from("contratos").select("*").eq("id", cid).maybeSingle(),
          supabase
            .from("contrato_logs")
            .select("*")
            .eq("contrato_id", cid)
            .order("created_at", { ascending: false }),
        ]);
        if (cErr) throw cErr;
        if (cancelled) return;
        setContrato(c);
        setLogs(l ?? []);
      } catch (e: any) {
        setError(e.message ?? "Erro ao carregar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-6">
        <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 text-[#E53935]" size={40} />
          <h1 className="text-lg font-semibold mb-2">Não foi possível abrir</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "Contrato não encontrado."}
          </p>
        </div>
      </div>
    );
  }

  const currentIdx = STAGES.findIndex((s) => s.key === contrato.status);
  const numero = "#" + contrato.id.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <header className="bg-[#0D1117] text-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="text-xs uppercase tracking-wider text-white/60">
            Acompanhamento de pedido
          </div>
          <h1 className="text-2xl font-semibold mt-1">{contrato.cliente_nome}</h1>
          <div className="text-sm text-white/70 mt-1">
            Contrato {numero} · Aberto em {fmtDate(contrato.data_criacao)}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Stepper */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-[#0D1117] mb-5">
            Status do seu pedido
          </h2>
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              const done = i < currentIdx || contrato.status === "finalizado";
              const active = i === currentIdx && contrato.status !== "finalizado";
              const color = done
                ? "#12B76A"
                : active
                ? "#1E6FBF"
                : "#CBD5E1";
              return (
                <div key={s.key} className="flex flex-col items-center min-w-[72px]">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: done || active ? color : "#F1F5F9",
                      color: done || active ? "#fff" : "#94A3B8",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div
                    className="text-xs mt-2 text-center font-medium"
                    style={{ color: done || active ? "#0D1117" : "#94A3B8" }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Resumo */}
        <section className="bg-white rounded-xl shadow-sm p-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Etapa atual
            </div>
            <div className="font-semibold mt-1 capitalize">
              {STAGES.find((s) => s.key === contrato.status)?.label ?? contrato.status}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Última atualização
            </div>
            <div className="font-semibold mt-1">{fmtDateTime(contrato.updated_at)}</div>
          </div>
          {contrato.data_finalizacao && (
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Finalizado em
              </div>
              <div className="font-semibold mt-1 text-[#12B76A]">
                {fmtDate(contrato.data_finalizacao)}
              </div>
            </div>
          )}
        </section>

        {/* Timeline */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-[#0D1117] mb-5">
            Histórico do pedido
          </h2>
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma movimentação registrada ainda.
            </div>
          ) : (
            <ol className="relative border-l-2 border-[#E8ECF2] ml-2 space-y-5">
              {logs.map((log) => (
                <li key={log.id} className="ml-5">
                  <span
                    className="absolute -left-[7px] flex items-center justify-center w-3 h-3 rounded-full"
                    style={{ backgroundColor: "#1E6FBF" }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#0D1117]">
                        {log.titulo}
                      </div>
                      {log.descricao && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {log.descricao}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Clock size={12} />
                      {fmtDateTime(log.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <footer className="text-center text-xs text-muted-foreground py-4">
          Em caso de dúvidas, entre em contato com sua loja.
        </footer>
      </main>
    </div>
  );
}

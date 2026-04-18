import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntregaConfirmDialog } from "@/components/logistica/EntregaConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
const fmtMoney = (v?: number | null) =>
  typeof v === "number" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2" }}>
      <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "#6B7A90", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export default function Logistica() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole, perfil } = useAuth();
  const podeConfirmar = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");
  const podeSincronizar = hasRole("admin") || hasRole("gerente");
  const lojaId = perfil?.loja_id ?? null;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; contratoId: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: entregas, isLoading } = useQuery({
    queryKey: ["logistica-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas")
        .select(`
          id, contrato_id, transportadora, data_prevista, custo_frete, status, data_confirmacao,
          contratos:contrato_id ( cliente_nome )
        `)
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Buscar último log Promob por contrato para extrair número do pedido
  const { data: promobLogs } = useQuery({
    queryKey: ["logistica-promob-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrato_logs")
        .select("contrato_id, descricao, created_at")
        .eq("acao", "promob_sincronizado")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<string, { numero: string; createdAt: string }>();
      for (const log of data ?? []) {
        if (map.has(log.contrato_id)) continue;
        const m = log.descricao?.match(/#(\d+)/);
        if (m) map.set(log.contrato_id, { numero: m[1], createdAt: log.created_at });
      }
      return map;
    },
  });

  const sincronizarPromob = async () => {
    if (!lojaId) {
      toast.error("Loja não identificada");
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-promob", {
        body: { loja_id: lojaId },
      });
      if (error) throw error;
      const resp = data as { ok?: boolean; atualizados?: number; erro?: string };
      if (resp?.ok) {
        toast.success(`${resp.atualizados ?? 0} contratos atualizados com previsão do Promob ✓`);
        qc.invalidateQueries({ queryKey: ["logistica-list"] });
        qc.invalidateQueries({ queryKey: ["logistica-promob-logs"] });
      } else if (resp?.erro?.toLowerCase().includes("login") || resp?.erro?.toLowerCase().includes("credenc")) {
        toast.error("Login falhou — verifique usuário e senha");
      } else {
        toast.warning(resp?.erro ?? "Não foi possível ler o portal — tente novamente");
      }
    } catch (e) {
      toast.warning("Não foi possível ler o portal — tente novamente");
    } finally {
      setSyncing(false);
    }
  };

  const metrics = useMemo(() => {
    if (!entregas) return { pendentes: 0, hoje: 0, custoMes: 0 };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    let pendentes = 0, hoje = 0, custoMes = 0;
    for (const e of entregas) {
      if (e.status === "pendente") pendentes++;
      if (e.data_confirmacao) {
        const dc = new Date(e.data_confirmacao);
        if (dc >= today) hoje++;
        if (dc >= monthStart) custoMes += Number(e.custo_frete) || 0;
      }
    }
    return { pendentes, hoje, custoMes };
  }, [entregas]);

  const filtered = useMemo(() => {
    if (!entregas) return [];
    return entregas.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cliente = (e as { contratos?: { cliente_nome?: string } }).contratos?.cliente_nome?.toLowerCase() ?? "";
        const num = e.contrato_id?.slice(0, 4) ?? "";
        if (!cliente.includes(q) && !num.includes(q)) return false;
      }
      return true;
    });
  }, [entregas, statusFilter, search]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>NEXO Logística</h1>
          <p style={{ fontSize: 13, color: "#6B7A90" }}>Entregas pendentes e realizadas</p>
        </div>
        {podeSincronizar && (
          <div className="flex items-center gap-2">
            <Button
              onClick={sincronizarPromob}
              disabled={syncing}
              style={{ backgroundColor: "#1E6FBF", color: "#fff" }}
            >
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar Promob
            </Button>
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Entregas pendentes" value={String(metrics.pendentes)} />
        <MetricCard label="Confirmadas hoje" value={String(metrics.hoje)} />
        <MetricCard label="Custo total de frete (mês)" value={fmtMoney(metrics.custoMes)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
          </SelectContent>
        </Select>
        <Input className="max-w-sm" placeholder="Buscar cliente ou nº..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2" }}>
        <table className="w-full">
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Nº", "Cliente", "Data prevista", "Transportadora", "Custo frete", "Promob", "Status", "Ações"].map((h) => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma entrega encontrada.</td></tr>
            )}
            {filtered.map((e) => {
              const cliente = (e as { contratos?: { cliente_nome?: string } }).contratos?.cliente_nome;
              const vencida = e.status === "pendente" && e.data_prevista && new Date(e.data_prevista) < new Date();
              const badge = e.status === "confirmada"
                ? { bg: "#D1FAE5", fg: "#05873C", label: "Confirmada" }
                : { bg: "#FEF3C7", fg: "#E8A020", label: "Pendente" };
              const promobNum = promobLogs?.get(e.contrato_id);
              return (
                <tr key={e.id} style={{ borderTop: "0.5px solid #E8ECF2", backgroundColor: vencida ? "#FEF8F8" : undefined }}>
                  <td className="px-4 py-3 text-sm font-medium">#{e.contrato_id?.slice(0, 4)}</td>
                  <td className="px-4 py-3 text-sm">{cliente ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{fmtDate(e.data_prevista)}</td>
                  <td className="px-4 py-3 text-sm">{e.transportadora ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{fmtMoney(Number(e.custo_frete))}</td>
                  <td className="px-4 py-3">
                    {promobNum ? (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 cursor-help"
                        style={{ backgroundColor: "#E6F3FF", color: "#1E6FBF", fontSize: 11, fontWeight: 500 }}
                        title={`Importado do Promob em ${new Date(promobNum.createdAt).toLocaleString("pt-BR")}`}
                      >
                        #{promobNum.numero}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5" style={{ backgroundColor: badge.bg, color: badge.fg, fontSize: 11, fontWeight: 500 }}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {e.status === "pendente" && podeConfirmar && (
                        <Button size="sm" style={{ backgroundColor: "#12B76A" }} onClick={() => setConfirmTarget({ id: e.id, contratoId: e.contrato_id })}>
                          Confirmar
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/contratos/${e.contrato_id}?tab=logistica`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {confirmTarget && (
        <EntregaConfirmDialog
          open={!!confirmTarget}
          onOpenChange={(o) => !o && setConfirmTarget(null)}
          entregaId={confirmTarget.id}
          contratoId={confirmTarget.contratoId}
        />
      )}
    </div>
  );
}

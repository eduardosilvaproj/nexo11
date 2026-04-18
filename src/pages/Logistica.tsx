import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntregaConfirmDialog } from "@/components/logistica/EntregaConfirmDialog";
import { EntregaCreateDialog } from "@/components/logistica/EntregaCreateDialog";
import { useAuth } from "@/contexts/AuthContext";

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="rounded-xl bg-white p-5"
      style={{ border: "0.5px solid #E8ECF2", borderTop: accent ? `3px solid ${accent}` : undefined }}
    >
      <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>{value}</div>
    </div>
  );
}

type Row = {
  contrato_id: string;
  cliente_nome: string;
  entrega_id: string | null;
  data_prevista: string | null;
  endereco: string | null;
  responsavel: string | null;
  status: "sem_entrega" | "agendada" | "confirmada";
};

export default function Logistica() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const podeConfirmar = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; contratoId: string } | null>(null);
  const [createTarget, setCreateTarget] = useState<string | null>(null);

  // Contratos liberados (trava_producao_ok = true)
  const { data: contratos, isLoading: loadingContratos } = useQuery({
    queryKey: ["logistica-contratos"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: boolean) => Promise<{
              data: Array<{ id: string; cliente_nome: string; cliente_contato: string | null }> | null;
              error: Error | null;
            }>;
          };
        };
      })
        .from("contratos")
        .select("id, cliente_nome, cliente_contato")
        .eq("trava_producao_ok", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: entregas, isLoading: loadingEntregas } = useQuery({
    queryKey: ["logistica-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas")
        .select(`
          id, contrato_id, transportadora, rota, data_prevista, custo_frete, status, data_confirmacao, confirmado_por,
          contratos:contrato_id ( cliente_nome )
        `)
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingContratos || loadingEntregas;

  const rows = useMemo<Row[]>(() => {
    if (!contratos || !entregas) return [];
    const byContrato = new Map<string, typeof entregas[number]>();
    for (const e of entregas) byContrato.set(e.contrato_id, e);

    const out: Row[] = [];
    for (const c of contratos) {
      const e = byContrato.get(c.id);
      if (!e) {
        out.push({
          contrato_id: c.id,
          cliente_nome: c.cliente_nome,
          entrega_id: null,
          data_prevista: null,
          endereco: c.cliente_contato,
          responsavel: null,
          status: "sem_entrega",
        });
      } else {
        out.push({
          contrato_id: c.id,
          cliente_nome: c.cliente_nome,
          entrega_id: e.id,
          data_prevista: e.data_prevista,
          endereco: e.rota ?? c.cliente_contato,
          responsavel: e.transportadora,
          status: e.status === "confirmada" ? "confirmada" : "agendada",
        });
      }
    }
    return out;
  }, [contratos, entregas]);

  const metrics = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let aAgendar = 0, agendadas = 0, hoje = 0;
    for (const r of rows) {
      if (r.status === "sem_entrega") aAgendar++;
      if (r.status === "agendada" && r.data_prevista && new Date(r.data_prevista) >= today) agendadas++;
    }
    for (const e of entregas ?? []) {
      if (e.data_confirmacao) {
        const dc = new Date(e.data_confirmacao); dc.setHours(0, 0, 0, 0);
        if (dc.getTime() === today.getTime()) hoje++;
      }
    }
    return { aAgendar, agendadas, hoje };
  }, [rows, entregas]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cliente = r.cliente_nome?.toLowerCase() ?? "";
        const num = r.contrato_id?.slice(0, 4) ?? "";
        if (!cliente.includes(q) && !num.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, search]);

  const badgeFor = (s: Row["status"]) => {
    if (s === "confirmada") return { bg: "#D1FAE5", fg: "#05873C", label: "Confirmada" };
    if (s === "agendada") return { bg: "#E6F3FF", fg: "#1E6FBF", label: "Agendada" };
    return { bg: "#FEF3C7", fg: "#E8A020", label: "Agendar" };
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>NEXO Logística</h1>
        <p style={{ fontSize: 13, color: "#6B7A90" }}>Agendamento e confirmação de entregas</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Entregas a agendar" value={String(metrics.aAgendar)} accent="#E8A020" />
        <MetricCard label="Entregas agendadas" value={String(metrics.agendadas)} accent="#1E6FBF" />
        <MetricCard label="Confirmadas hoje" value={String(metrics.hoje)} accent="#12B76A" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="sem_entrega">Sem entrega cadastrada</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
          </SelectContent>
        </Select>
        <Input className="max-w-sm" placeholder="Buscar cliente ou nº..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2" }}>
        <table className="w-full">
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Nº", "Cliente", "Data prevista", "Endereço", "Responsável", "Status", "Ações"].map((h) => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum contrato liberado para entrega.</td></tr>
            )}
            {filtered.map((r) => {
              const badge = badgeFor(r.status);
              const semEntrega = r.status === "sem_entrega";
              return (
                <tr key={r.contrato_id} style={{ borderTop: "0.5px solid #E8ECF2", backgroundColor: semEntrega ? "#FEF8F0" : undefined }}>
                  <td className="px-4 py-3 text-sm font-medium">#{r.contrato_id?.slice(0, 4)}</td>
                  <td className="px-4 py-3 text-sm">{r.cliente_nome ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{fmtDate(r.data_prevista)}</td>
                  <td className="px-4 py-3 text-sm">{r.endereco ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{r.responsavel ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5" style={{ backgroundColor: badge.bg, color: badge.fg, fontSize: 11, fontWeight: 500 }}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {semEntrega && (
                        <Button size="sm" style={{ backgroundColor: "#E8A020", color: "#fff" }} onClick={() => setCreateTarget(r.contrato_id)}>
                          Agendar
                        </Button>
                      )}
                      {r.status === "agendada" && podeConfirmar && r.entrega_id && (
                        <Button size="sm" style={{ backgroundColor: "#12B76A", color: "#fff" }} onClick={() => setConfirmTarget({ id: r.entrega_id!, contratoId: r.contrato_id })}>
                          Confirmar
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/contratos/${r.contrato_id}?tab=logistica`)}>
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
      {createTarget && (
        <EntregaCreateDialog
          open={!!createTarget}
          onOpenChange={(o) => !o && setCreateTarget(null)}
          contratoId={createTarget}
        />
      )}
    </div>
  );
}

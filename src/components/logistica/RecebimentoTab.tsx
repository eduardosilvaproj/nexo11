import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, FileText, ScanLine, Home, Warehouse, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecebimentoDialog } from "@/components/logistica/RecebimentoDialog";
import { ImportarCaixasPdfDialog } from "@/components/logistica/ImportarCaixasPdfDialog";

type StatusRecebimento = "nao_iniciado" | "em_recebimento" | "recebido_deposito" | "recebido_cliente" | "entrega_finalizada";

interface PedidoRecebimento {
  id: string;
  numero_pedido: string;
  oc: string | null;
  cliente_nome: string | null;
  contratos: { cliente_nome?: string } | null;
  data_prevista: string | null;
  status: string;
  status_recebimento: StatusRecebimento;
  destino_recebimento: "deposito" | "cliente" | null;
  total_caixas_previstas: number;
  total_caixas_recebidas: number;
  recebido_em: string | null;
  recebido_por: string | null;
  entregue_para: string | null;
}

const STATUS_LABEL: Record<StatusRecebimento, { label: string; color: string; bg: string }> = {
  nao_iniciado: { label: "Aguardando caixas", color: "#6B7A90", bg: "#F1F5F9" },
  em_recebimento: { label: "Em recebimento", color: "#1E6FBF", bg: "#DBEAFE" },
  recebido_deposito: { label: "No deposito", color: "#7C3AED", bg: "#EDE9FE" },
  recebido_cliente: { label: "Entregue ao cliente", color: "#05873C", bg: "#D1FAE5" },
  entrega_finalizada: { label: "Entrega finalizada", color: "#05873C", bg: "#D1FAE5" },
};

const ALL = "__all__";

export function RecebimentoTab() {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id ?? null;

  const [importPdfOpen, setImportPdfOpen] = useState(false);
  const [receberId, setReceberId] = useState<string | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<string>(ALL);
  const [busca, setBusca] = useState("");

  // Busca pedidos que tem caixas previstas OU estao aptos a receber
  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["recebimento-lista", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producao_terceirizada")
        .select(`
          id, numero_pedido, oc, cliente_nome, data_prevista, status,
          status_recebimento, destino_recebimento, total_caixas_previstas, total_caixas_recebidas,
          recebido_em, recebido_por, entregue_para,
          contratos:contrato_id ( cliente_nome )
        `)
        .eq("loja_id", lojaId!)
        .in("status", ["aguardando_fabricacao", "em_producao", "em_transporte", "pronto_retirada", "atrasado"])
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PedidoRecebimento[];
    },
  });

  const filtered = useMemo(() => {
    if (!pedidos) return [];
    return pedidos.filter((p) => {
      if (statusFiltro === "com_caixas" && p.total_caixas_previstas === 0) return false;
      if (statusFiltro === "pronto" && p.total_caixas_previstas > 0 && p.total_caixas_recebidas < p.total_caixas_previstas && p.status_recebimento === "nao_iniciado") {
        return true;
      }
      if (statusFiltro !== "all" && statusFiltro !== "com_caixas" && p.status_recebimento !== statusFiltro) return false;
      if (statusFiltro === "all" && p.status_recebimento === "entrega_finalizada") return false;
      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        if (!p.numero_pedido.toLowerCase().includes(q) &&
            !(p.oc ?? "").toLowerCase().includes(q) &&
            !(p.contratos?.cliente_nome ?? "").toLowerCase().includes(q) &&
            !(p.cliente_nome ?? "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [pedidos, statusFiltro, busca]);

  const metrics = useMemo(() => {
    const m = { aguardando: 0, emRecebimento: 0, completos: 0, total: 0, caixas: 0, recebidas: 0 };
    for (const p of pedidos ?? []) {
      m.total += 1;
      m.caixas += p.total_caixas_previstas;
      m.recebidas += p.total_caixas_recebidas;
      if (p.status_recebimento === "entrega_finalizada" || p.status_recebimento === "recebido_cliente") m.completos++;
      else if (p.status_recebimento === "em_recebimento") m.emRecebimento++;
      else if (p.total_caixas_previstas > 0) m.aguardando++;
    }
    return m;
  }, [pedidos]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>Recebimento de Mercadoria</h2>
          <div style={{ fontSize: 12, color: "#6B7A90", marginTop: 2 }}>
            Bipagem de caixas vindas do fabricante (PDF Promob/Casimiro)
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportPdfOpen(true)}>
            <FileText className="mr-2 h-4 w-4" /> Importar PDF de Caixas
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Aguardando recebimento" value={metrics.aguardando} color="#E8A020" />
        <MetricCard label="Em recebimento" value={metrics.emRecebimento} color="#1E6FBF" />
        <MetricCard label="Entregues finalizados" value={metrics.completos} color="#05873C" />
        <MetricCard label="Caixas (previstas/recebidas)" value={`${metrics.recebidas}/${metrics.caixas}`} color="#7C3AED" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, OC ou nº pedido…"
          className="w-72"
        />
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="com_caixas">Com caixas previstas</SelectItem>
            <SelectItem value="nao_iniciado">Aguardando caixas</SelectItem>
            <SelectItem value="em_recebimento">Em recebimento</SelectItem>
            <SelectItem value="recebido_deposito">No deposito</SelectItem>
            <SelectItem value="recebido_cliente">Entregue ao cliente</SelectItem>
            <SelectItem value="entrega_finalizada">Entrega finalizada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white border border-[#E8ECF2]">
        <table className="w-full min-w-[1000px]">
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Pedido", "OC", "Cliente", "Previsao", "Caixas", "Destino", "Status", "Acao"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left"
                  style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum pedido aguardando. Importe o PDF de caixas para comecar.
              </td></tr>
            )}
            {filtered.map((p) => {
              const pct = p.total_caixas_previstas > 0
                ? Math.round((p.total_caixas_recebidas / p.total_caixas_previstas) * 100)
                : 0;
              const info = STATUS_LABEL[p.status_recebimento] ?? STATUS_LABEL.nao_iniciado;
              const cliente = p.contratos?.cliente_nome || p.cliente_nome || "-";
              const semCaixas = p.total_caixas_previstas === 0;
              return (
                <tr key={p.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-4 py-3 text-sm font-medium">#{p.numero_pedido}</td>
                  <td className="px-4 py-3 text-sm">{p.oc || "-"}</td>
                  <td className="px-4 py-3 text-sm" style={{ maxWidth: 220 }}>{cliente}</td>
                  <td className="px-4 py-3 text-sm">
                    {p.data_prevista ? new Date(p.data_prevista + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {semCaixas ? (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6B7A90" }}>
                        <AlertTriangle className="h-3 w-3" style={{ color: "#E8A020" }} />
                        <span>Sem caixas previstas</span>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-semibold" style={{ color: pct === 100 ? "#05873C" : "#0D1117" }}>
                          {p.total_caixas_recebidas} / {p.total_caixas_previstas}
                        </div>
                        <div className="mt-1 h-1.5 w-24 rounded-full" style={{ backgroundColor: "#E8ECF2", overflow: "hidden" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct === 100 ? "#05873C" : "#1E6FBF",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.destino_recebimento === "cliente" && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: "#1E6FBF" }}>
                        <Home className="h-3 w-3" />
                        <span>Cliente{p.entregue_para ? ` (${p.entregue_para})` : ""}</span>
                      </div>
                    )}
                    {p.destino_recebimento === "deposito" && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: "#7C3AED" }}>
                        <Warehouse className="h-3 w-3" />
                        <span>Deposito</span>
                      </div>
                    )}
                    {!p.destino_recebimento && <span className="text-xs text-muted-foreground">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5"
                      style={{ backgroundColor: info.bg, color: info.color, fontSize: 11, fontWeight: 500 }}
                    >
                      {info.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {semCaixas ? (
                      <span className="text-xs text-muted-foreground">importe o PDF</span>
                    ) : (
                      <Button size="sm" onClick={() => setReceberId(p.id)} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
                        <ScanLine className="h-3 w-3 mr-1" />
                        {p.status_recebimento === "em_recebimento" ? "Continuar" : "Receber"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RecebimentoDialog
        open={!!receberId}
        onOpenChange={(o) => !o && setReceberId(null)}
        pedidoId={receberId}
        lojaId={lojaId}
      />
      <ImportarCaixasPdfDialog
        open={importPdfOpen}
        onOpenChange={setImportPdfOpen}
        lojaId={lojaId}
      />
    </>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>{value}</div>
    </div>
  );
}

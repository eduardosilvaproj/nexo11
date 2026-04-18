import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImportPromobXlsDialog } from "@/components/logistica/ImportPromobXlsDialog";
import { useAuth } from "@/contexts/AuthContext";

type StatusT = "aguardando_fabricacao" | "em_producao" | "pronto_retirada" | "atrasado";

interface Pedido {
  id: string;
  numero_pedido: string;
  oc: string | null;
  contrato_id: string | null;
  data_prevista: string | null;
  transportadora: string | null;
  status: StatusT;
  importado_em: string;
  contratos?: { cliente_nome?: string } | null;
}

const STATUS_OPTS: { value: StatusT; label: string; bg: string; fg: string }[] = [
  { value: "aguardando_fabricacao", label: "Aguardando fabricação", bg: "#FEF3C7", fg: "#E8A020" },
  { value: "em_producao", label: "Em produção", bg: "#E6F3FF", fg: "#1E6FBF" },
  { value: "pronto_retirada", label: "Pronto para retirada", bg: "#D1FAE5", fg: "#05873C" },
  { value: "atrasado", label: "Atrasado", bg: "#FEE4E2", fg: "#E53935" },
];

const statusInfo = (s: StatusT) => STATUS_OPTS.find((o) => o.value === s)!;

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>{value}</div>
    </div>
  );
}

function diasRestantes(data: string | null): { dias: number; texto: string; color: string; warn: boolean } | null {
  if (!data) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const d = new Date(data); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return { dias: diff, texto: `${Math.abs(diff)} dias atraso`, color: "#E53935", warn: true };
  if (diff < 3) return { dias: diff, texto: `${diff}d`, color: "#E53935", warn: true };
  if (diff <= 7) return { dias: diff, texto: `${diff}d`, color: "#E8A020", warn: false };
  return { dias: diff, texto: `${diff}d`, color: "#12B76A", warn: false };
}

export function TerceirizadaTab() {
  const qc = useQueryClient();
  const { perfil, hasRole } = useAuth();
  const lojaId = perfil?.loja_id ?? null;
  const podeImportar = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");
  const [importOpen, setImportOpen] = useState(false);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["producao-terceirizada"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Pedido[] | null; error: Error | null }> };
        };
      };
      const { data, error } = await sb
        .from("producao_terceirizada")
        .select("id, numero_pedido, oc, contrato_id, data_prevista, transportadora, status, importado_em, contratos:contrato_id(cliente_nome)")
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const metrics = useMemo(() => {
    const m = { aguardando: 0, pronto: 0, atrasado: 0 };
    if (!pedidos) return m;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    for (const p of pedidos) {
      if (p.status === "pronto_retirada") m.pronto++;
      else if (p.status === "atrasado" || (p.data_prevista && new Date(p.data_prevista) < hoje)) m.atrasado++;
      else if (p.status === "aguardando_fabricacao") m.aguardando++;
    }
    return m;
  }, [pedidos]);

  const updateStatus = async (p: Pedido, novo: StatusT) => {
    const sb = supabase as unknown as {
      from: (t: string) => {
        update: (u: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> };
      };
    };
    const { error } = await sb.from("producao_terceirizada").update({ status: novo }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }

    if (novo === "pronto_retirada" && p.contrato_id) {
      const sb2 = supabase as unknown as {
        from: (t: string) => { update: (u: unknown) => { eq: (c: string, v: string) => Promise<unknown> } };
      };
      await sb2.from("contratos").update({ trava_producao_ok: true }).eq("id", p.contrato_id);
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("contrato_logs").insert({
        contrato_id: p.contrato_id,
        acao: "producao_terceirizada_concluida",
        titulo: "Produção terceirizada concluída",
        descricao: `Pedido #${p.numero_pedido} pronto para retirada`,
        autor_id: userData.user?.id ?? null,
        autor_nome: userData.user?.user_metadata?.nome || userData.user?.email || null,
      });
      toast.success("Produção marcada como pronta! Logística liberada.");
    } else {
      toast.success("Status atualizado");
    }
    qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>Pedidos no fabricante</h2>
        {podeImportar && (
          <Button variant="outline" onClick={() => setImportOpen(true)} style={{ borderColor: "#1E6FBF", color: "#1E6FBF" }}>
            <Upload className="mr-2 h-4 w-4" /> Importar XLS Promob
          </Button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Aguardando fabricação" value={metrics.aguardando} color="#E8A020" />
        <MetricCard label="Pronto para retirada" value={metrics.pronto} color="#12B76A" />
        <MetricCard label="Atrasados" value={metrics.atrasado} color="#E53935" />
      </div>

      <div className="overflow-hidden rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2" }}>
        <table className="w-full">
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Nº pedido", "OC / Cliente", "Contrato", "Data prevista", "Dias restantes", "Status", "Ações"].map((h) => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && (!pedidos || pedidos.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum pedido importado. Use "Importar XLS Promob" para começar.
              </td></tr>
            )}
            {pedidos?.map((p) => {
              const dr = diasRestantes(p.data_prevista);
              const info = statusInfo(p.status);
              return (
                <tr key={p.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-4 py-3 text-sm font-medium">#{p.numero_pedido}</td>
                  <td className="px-4 py-3 text-sm">{p.contratos?.cliente_nome ?? p.oc ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{p.contrato_id ? `#${p.contrato_id.slice(0, 4)}` : "—"}</td>
                  <td className="px-4 py-3 text-sm">{p.data_prevista ? new Date(p.data_prevista).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-4 py-3">
                    {dr ? (
                      <span className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 500, color: dr.color }}>
                        {dr.warn && <AlertTriangle className="h-3 w-3" />}
                        {dr.texto}
                      </span>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Select value={p.status} onValueChange={(v) => updateStatus(p, v as StatusT)}>
                      <SelectTrigger className="h-8 w-48 text-xs" style={{ backgroundColor: info.bg, color: info.fg, borderColor: "transparent" }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.importado_em).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ImportPromobXlsDialog open={importOpen} onOpenChange={setImportOpen} lojaId={lojaId} />
    </>
  );
}

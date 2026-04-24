import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle, Link2, FileSpreadsheet, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { NovoPedidoTerceirizadoDialog } from "@/components/producao/NovoPedidoTerceirizadoDialog";
import { VincularPedidoDialog } from "@/components/producao/VincularPedidoDialog";
import { ImportFabricanteXlsDialog } from "@/components/producao/ImportFabricanteXlsDialog";
import { useAuth } from "@/contexts/AuthContext";

type StatusT = "aguardando_fabricacao" | "em_producao" | "pronto_retirada" | "atrasado";

interface Pedido {
  id: string;
  numero_pedido: string;
  oc: string | null;
  contrato_id: string | null;
  fornecedor_id: string | null;
  data_prevista: string | null;
  transportadora: string | null;
  status: StatusT;
  importado_em: string;
  tipo_entrada?: string;
  tipo?: string | null;
  situacao?: string | null;
  vinculo_status?: string;
  cliente_nome?: string | null;
  contratos?: { cliente_nome?: string } | null;
  fornecedores?: { nome?: string } | null;
}

const STATUS_OPTS: { value: StatusT; label: string; bg: string; fg: string }[] = [
  { value: "aguardando_fabricacao", label: "Aguardando fabricação", bg: "#FEF3C7", fg: "#E8A020" },
  { value: "em_producao", label: "Em produção", bg: "#E6F3FF", fg: "#1E6FBF" },
  { value: "pronto_retirada", label: "Pronto para retirada", bg: "#D1FAE5", fg: "#05873C" },
  { value: "atrasado", label: "Atrasado", bg: "#FEE4E2", fg: "#E53935" },
];

const statusInfo = (s: StatusT) => STATUS_OPTS.find((o) => o.value === s)!;

const ALL = "__all__";

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>{value}</div>
    </div>
  );
}

function diasRestantes(data: string | null) {
  if (!data) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const d = new Date(data); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return { texto: `${Math.abs(diff)} dias atraso`, color: "#E53935", warn: true };
  if (diff < 3) return { texto: `${diff}d`, color: "#E53935", warn: true };
  if (diff <= 7) return { texto: `${diff}d`, color: "#E8A020", warn: false };
  return { texto: `${diff}d`, color: "#12B76A", warn: false };
}

function DataPrevistaCell({ pedido, onSaved }: { pedido: Pedido; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const value = pedido.data_prevista ? new Date(pedido.data_prevista + "T00:00:00") : undefined;

  const handleSelect = async (date: Date | undefined) => {
    if (!date) return;
    const iso = format(date, "yyyy-MM-dd");
    const sb = supabase as unknown as {
      from: (t: string) => { update: (u: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> } };
    };
    const { error } = await sb.from("producao_terceirizada").update({ data_prevista: iso }).eq("id", pedido.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Data atualizada");
    setOpen(false);
    onSaved();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="text-sm hover:underline focus:outline-none"
          style={{ color: pedido.data_prevista ? "#0D1117" : "#6B7A90" }}
        >
          {pedido.data_prevista ? new Date(pedido.data_prevista + "T00:00:00").toLocaleDateString("pt-BR") : "Definir data"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export function TerceirizadaTab() {
  const qc = useQueryClient();
  const { perfil, hasRole } = useAuth();
  const lojaId = perfil?.loja_id ?? null;
  const podeCriar = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");
  const [novoOpen, setNovoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [vincularId, setVincularId] = useState<string | null>(null);
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>(ALL);

  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores-filtro-producao", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data } = await (supabase as unknown as {
        from: (t: string) => { select: (s: string) => { eq: (c: string, v: unknown) => { eq: (c: string, v: unknown) => { order: (c: string) => Promise<{ data: { id: string; nome: string }[] | null }> } } } };
      }).from("fornecedores").select("id, nome").eq("loja_id", lojaId!).eq("ativo", true).order("nome");
      return data ?? [];
    },
  });

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["producao-terceirizada"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Pedido[] | null; error: Error | null }> } };
      };
      const { data, error } = await sb
        .from("producao_terceirizada")
        .select("id, numero_pedido, oc, contrato_id, fornecedor_id, data_prevista, transportadora, status, importado_em, tipo_entrada, tipo, situacao, vinculo_status, cliente_nome, contratos:contrato_id(cliente_nome), fornecedores:fornecedor_id(nome)")
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!pedidos) return [];
    if (filtroFornecedor === ALL) return pedidos;
    return pedidos.filter((p) => p.fornecedor_id === filtroFornecedor);
  }, [pedidos, filtroFornecedor]);

  const metrics = useMemo(() => {
    const m = { aguardando: 0, pronto: 0, atrasado: 0 };
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    for (const p of filtered) {
      if (p.status === "pronto_retirada") m.pronto++;
      else if (p.status === "atrasado" || (p.data_prevista && new Date(p.data_prevista) < hoje)) m.atrasado++;
      else if (p.status === "aguardando_fabricacao") m.aguardando++;
    }
    return m;
  }, [filtered]);

  const updateStatus = async (p: Pedido, novo: StatusT) => {
    const sb = supabase as unknown as {
      from: (t: string) => { update: (u: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> } };
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
        etapa: "producao",
        titulo: "Produção terceirizada concluída",
        descricao: `Pedido #${p.numero_pedido} pronto para retirada`,
        usuario_nome: userData.user?.user_metadata?.nome || userData.user?.email || "Sistema",
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
        {podeCriar && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar XLSX do Fabricante
            </Button>
            <Button onClick={() => setNovoOpen(true)} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
              <Plus className="mr-2 h-4 w-4" /> Novo Pedido
            </Button>
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Aguardando fabricação" value={metrics.aguardando} color="#E8A020" />
        <MetricCard label="Pronto para retirada" value={metrics.pronto} color="#12B76A" />
        <MetricCard label="Atrasados" value={metrics.atrasado} color="#E53935" />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os fornecedores</SelectItem>
            {fornecedores?.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white border border-[#E8ECF2]">
        <table className="w-full min-w-[1000px]">
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Nº pedido", "OC / Cliente", "Cliente", "Tipo", "Situação", "Data prevista", "Dias restantes", "Vínculo", "Status", "Ações"].map((h) => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum pedido cadastrado. Use "+ Novo Pedido" para começar.
              </td></tr>
            )}
            {filtered.map((p) => {
              const dr = diasRestantes(p.data_prevista);
              const info = statusInfo(p.status);
              const isPendente = p.vinculo_status === "pendente";
              const tipoUp = (p.tipo || "").toUpperCase();
              const sitUp = (p.situacao || "").toUpperCase();
              return (
                <tr key={p.id} style={{ borderTop: "0.5px solid #E8ECF2", backgroundColor: isPendente ? "#FFFBEB" : undefined }}>
                  <td className="px-4 py-3 text-sm font-medium">#{p.numero_pedido}</td>
                  <td className="px-4 py-3 text-sm">{p.oc ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{p.cliente_nome ?? p.contratos?.cliente_nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    {tipoUp === "V" ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#E6F3FF", color: "#1E6FBF", fontSize: 11, fontWeight: 500 }}>Venda</span>
                    ) : tipoUp === "A" ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#FEF3C7", color: "#E8A020", fontSize: 11, fontWeight: 500 }}>Assistência</span>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {sitUp === "L" ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#FEF3C7", color: "#B45309", fontSize: 11, fontWeight: 500 }}>Em Fabricação</span>
                    ) : sitUp === "T" ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#D1FAE5", color: "#05873C", fontSize: 11, fontWeight: 500 }}>Em Transporte</span>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <DataPrevistaCell pedido={p} onSaved={() => qc.invalidateQueries({ queryKey: ["producao-terceirizada"] })} />
                  </td>
                  <td className="px-4 py-3">
                    {dr ? (
                      <span className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 500, color: dr.color }}>
                        {dr.warn && <AlertTriangle className="h-3 w-3" />}
                        {dr.texto}
                      </span>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isPendente ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#FEF3C7", color: "#B45309", fontSize: 11, fontWeight: 500 }}>
                        ⚠ Pendente
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#D1FAE5", color: "#05873C", fontSize: 11, fontWeight: 500 }}>
                        ✓ Vinculado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Select value={p.status} onValueChange={(v) => updateStatus(p, v as StatusT)}>
                      <SelectTrigger className="h-8 w-44 text-xs" style={{ backgroundColor: info.bg, color: info.fg, borderColor: "transparent" }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {isPendente && (
                      <Button size="sm" variant="outline" onClick={() => setVincularId(p.id)}>
                        <Link2 className="h-3 w-3 mr-1" /> Vincular
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NovoPedidoTerceirizadoDialog open={novoOpen} onOpenChange={setNovoOpen} lojaId={lojaId} />
      <ImportFabricanteXlsDialog open={importOpen} onOpenChange={setImportOpen} lojaId={lojaId} fornecedorId={null} />
      <VincularPedidoDialog open={!!vincularId} onOpenChange={(o) => !o && setVincularId(null)} pedidoId={vincularId} lojaId={lojaId} />
    </>
  );
}

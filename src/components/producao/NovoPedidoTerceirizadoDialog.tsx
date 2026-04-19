import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImportFabricanteXlsDialog } from "@/components/producao/ImportFabricanteXlsDialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lojaId: string | null;
}

const MANUAL = "__manual__";
const NONE = "__none__";

interface Fornecedor { id: string; nome: string; tipo: string; prazo_padrao_dias: number }
interface ClienteRow { id: string; nome: string }
interface ContratoRow { id: string; cliente_nome: string; cliente_id: string | null }

export function NovoPedidoTerceirizadoDialog({ open, onOpenChange, lojaId }: Props) {
  const qc = useQueryClient();
  const [fornecedorId, setFornecedorId] = useState<string>(NONE);
  const [clienteId, setClienteId] = useState<string>(NONE);
  const [contratoId, setContratoId] = useState<string>(MANUAL);
  const [numeroPedido, setNumeroPedido] = useState("");
  const [oc, setOc] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores-ativos-pedido", lojaId],
    enabled: open && !!lojaId,
    queryFn: async () => {
      const { data } = await (supabase as unknown as {
        from: (t: string) => { select: (s: string) => { eq: (c: string, v: unknown) => { eq: (c: string, v: unknown) => { order: (c: string) => Promise<{ data: Fornecedor[] | null }> } } } };
      }).from("fornecedores").select("id, nome, tipo, prazo_padrao_dias").eq("loja_id", lojaId!).eq("ativo", true).order("nome");
      return data ?? [];
    },
  });

  const fornecedor = fornecedores?.find((f) => f.id === fornecedorId);
  const isFabricaXml = fornecedor?.tipo === "fabrica_xml";

  const { data: clientes } = useQuery({
    queryKey: ["clientes-novo-pedido", lojaId],
    enabled: open && !!lojaId,
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id, nome").eq("loja_id", lojaId!).order("nome");
      return (data ?? []) as ClienteRow[];
    },
  });

  const { data: contratos } = useQuery({
    queryKey: ["contratos-novo-pedido", lojaId, clienteId],
    enabled: open && !!lojaId,
    queryFn: async () => {
      let q = supabase.from("contratos").select("id, cliente_nome, cliente_id").eq("loja_id", lojaId!).neq("status", "finalizado");
      if (clienteId !== NONE) q = q.eq("cliente_id", clienteId);
      const { data } = await q.order("created_at", { ascending: false });
      return (data ?? []) as ContratoRow[];
    },
  });

  useEffect(() => {
    if (!open) {
      setFornecedorId(NONE); setClienteId(NONE); setContratoId(MANUAL);
      setNumeroPedido(""); setOc(""); setDescricao(""); setDataPrevista(""); setObservacoes("");
    }
  }, [open]);

  // Auto-fill data_prevista when fornecedor changes
  useEffect(() => {
    if (fornecedor && !dataPrevista) {
      const d = new Date();
      d.setDate(d.getDate() + (fornecedor.prazo_padrao_dias || 30));
      setDataPrevista(d.toISOString().slice(0, 10));
    }
  }, [fornecedor, dataPrevista]);

  // When contrato selected, sync cliente
  useEffect(() => {
    if (contratoId !== MANUAL && contratos) {
      const c = contratos.find((x) => x.id === contratoId);
      if (c?.cliente_id) setClienteId(c.cliente_id);
    }
  }, [contratoId, contratos]);

  const salvar = async () => {
    if (!lojaId) return toast.error("Loja não identificada");
    if (fornecedorId === NONE) return toast.error("Selecione o fornecedor");
    if (!numeroPedido.trim()) return toast.error("Informe o nº do pedido");
    if (clienteId === NONE && contratoId === MANUAL) return toast.error("Selecione um cliente ou contrato");

    const cliNome = clientes?.find((c) => c.id === clienteId)?.nome
      ?? contratos?.find((c) => c.id === contratoId)?.cliente_nome
      ?? "";

    setSalvando(true);
    const obsFinal = [descricao, observacoes].filter(Boolean).join(" | ");
    const payload = {
      loja_id: lojaId,
      fornecedor_id: fornecedorId,
      numero_pedido: numeroPedido.trim(),
      oc: oc.trim() || cliNome,
      contrato_id: contratoId === MANUAL ? null : contratoId,
      data_prevista: dataPrevista || null,
      transportadora: obsFinal || null,
      status: "aguardando_fabricacao" as const,
      tipo_entrada: "manual",
      vinculo_status: "vinculado",
    };

    const sb = supabase as unknown as {
      from: (t: string) => { insert: (v: unknown) => Promise<{ error: Error | null }> };
    };
    const { error } = await sb.from("producao_terceirizada").insert(payload);
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido criado");
    qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo pedido no fabricante</DialogTitle>
            <DialogDescription>Selecione um fornecedor para começar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Fornecedor *</Label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {fornecedores?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome} {f.tipo === "fabrica_xml" ? "· Fábrica XML" : "· Terceirizado"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isFabricaXml && (
              <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#F0F7FF", border: "1px solid #BFDBFE" }}>
                <div style={{ fontSize: 12, color: "#1E6FBF", fontWeight: 500 }}>
                  Recomendado: importe vários pedidos de uma vez via XLS
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setImportOpen(true)}
                  style={{ backgroundColor: "#1E6FBF", color: "#fff" }}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar XML do Fabricante
                </Button>
                <div style={{ fontSize: 11, color: "#48556B" }}>Ou preencha manualmente abaixo:</div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setContratoId(MANUAL); }}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {clientes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Contrato (opcional)</Label>
              <Select value={contratoId} onValueChange={setContratoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={MANUAL}>Sem contrato</SelectItem>
                  {contratos?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>#{c.id.slice(0, 4)} — {c.cliente_nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nº pedido *</Label>
                <Input value={numeroPedido} onChange={(e) => setNumeroPedido(e.target.value)} placeholder="Ex: 12345" />
              </div>
              <div className="space-y-1.5">
                <Label>OC</Label>
                <Input value={oc} onChange={(e) => setOc(e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Cozinha modulada" />
            </div>

            <div className="space-y-1.5">
              <Label>Data prevista {fornecedor && <span style={{ fontSize: 11, color: "#6B7A90" }}>(prazo padrão: {fornecedor.prazo_padrao_dias}d)</span>}</Label>
              <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando} style={{ backgroundColor: "#1E6FBF" }}>
              {salvando ? "Salvando..." : "Criar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportFabricanteXlsDialog
        open={importOpen}
        onOpenChange={(o) => { setImportOpen(o); if (!o) onOpenChange(false); }}
        lojaId={lojaId}
        fornecedorId={fornecedorId === NONE ? null : fornecedorId}
      />
    </>
  );
}

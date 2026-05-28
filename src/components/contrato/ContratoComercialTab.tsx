import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Loader2, Calculator } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { ContractPDF } from "./ContractPDF";
import { ContractPreviewModal } from "./ContractPreviewModal";
import { CustoViagemCard } from "./CustoViagemCard";
import { ChecklistComercialCard } from "./ChecklistComercialCard";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";



interface ComercialTabProps {
  contrato: {
    id: string;
    cliente_nome: string;
    cliente_contato: string | null;
    cliente_id?: string | null;
    vendedor_id: string | null;
    data_criacao: string;

    assinado: boolean;
    data_assinatura?: string | null;
    assinatura_nome?: string | null;
    assinatura_ip?: string | null;
    assinatura_hash?: string | null;
    contrato_gerado?: boolean;
    loja_id: string;
    valor_venda?: number;
  };
  loja: any;
  ambientes: any[];
  orcamentos: any[];
  onAvancar?: () => void;
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const marginColor = (m: number) => {
  if (m >= 30) return "#12B76A";
  if (m >= 15) return "#E8A020";
  return "#E53935";
};

const Card = ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
  <div
    className="rounded-xl bg-white"
    style={{ border: "0.5px solid #E8ECF2", padding: 20 }}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117", margin: 0 }}>
        {title}
      </h3>
      {actions}
    </div>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-1.5">
    <span style={{ fontSize: 12, color: "#6B7A90" }}>{label}</span>
    <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>{value || "—"}</span>
  </div>
);

export function ContratoComercialTab({ contrato, loja, ambientes, orcamentos, onAvancar }: ComercialTabProps) {
  const qc = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parcelasOpen, setParcelasOpen] = useState(false);


  const { data: vendedor } = useQuery({
    queryKey: ["usuario", contrato.vendedor_id],
    queryFn: async () => {
      if (!contrato.vendedor_id) return null;
      const { data } = await supabase
        .from("usuarios")
        .select("nome, email")
        .eq("id", contrato.vendedor_id)
        .maybeSingle();
      return data;
    },
    enabled: !!contrato.vendedor_id,
  });

  const { data: lead } = useQuery({
    queryKey: ["lead-by-contrato", contrato.id, contrato.cliente_nome],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("origem, observacoes, email")
        .eq("nome", contrato.cliente_nome)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: dre } = useQuery({
    queryKey: ["dre", contrato.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("dre_contrato")
        .select("*")
        .eq("contrato_id", contrato.id)
        .maybeSingle();
      return data;
    },
  });

  async function handleGerarContrato() {
    try {
      setIsSubmitting(true);
      // 1. Marcar contrato_gerado no DB
      const { error: updErr } = await supabase
        .from("contratos")
        .update({ contrato_gerado: true })
        .eq("id", contrato.id);

      if (updErr) throw updErr;

      // 2. Invalidar queries para atualizar UI
      qc.invalidateQueries({ queryKey: ["contrato_dre_view", contrato.id] });
      
      // 3. Abrir modal de preview
      setPreviewOpen(true);
      toast.success("Contrato preparado com sucesso.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao gerar contrato");
    } finally {
      setIsSubmitting(false);
    }
  }


  const produto = Number(dre?.custo_produto_previsto ?? 0);
  const montagem = Number(dre?.custo_montagem_previsto ?? 0);
  const frete = Number(dre?.custo_frete_previsto ?? 0);
  const comissao = Number(dre?.custo_comissao_previsto ?? 0);
  const outros = Number(dre?.outros_custos_previstos ?? 0);
  const total = produto + montagem + frete + comissao + outros;
  const margem = Number(dre?.margem_prevista ?? 0);

  const formatDateTime = (date: any) => {
    if (!date) return '—';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const dataAssinatura = contrato.assinado
    ? formatDateTime(contrato.data_assinatura || contrato.data_criacao)
    : "Não assinado";

  return (
    <div className="flex flex-col gap-4">
      <Card 
        title="Dados do contrato"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setParcelasOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-white transition-all hover:opacity-90 active:scale-95"
              style={{ 
                backgroundColor: "#E8A020", 
                fontSize: 12, 
                fontWeight: 500,
              }}
            >
              <Calculator size={14} />
              Gerar Parcelas
            </button>
            <button
              onClick={handleGerarContrato}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ 
                backgroundColor: "#1E6FBF", 
                fontSize: 12, 
                fontWeight: 500,
              }}
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText size={14} />}
              Gerar Contrato
            </button>
          </div>
        }
      >

        <Field label="Cliente" value={contrato.cliente_nome} />
        <Field label="Telefone" value={contrato.cliente_contato} />
        <Field label="E-mail" value={lead?.email} />
        <Field label="Origem do lead" value={lead?.origem} />
        <Field label="Vendedor" value={vendedor?.nome} />
        {contrato.assinado ? (
          <div 
            className="mt-6 p-4 rounded-lg border flex flex-col gap-3" 
            style={{ backgroundColor: "#F0FDF4", borderColor: "#05873C", color: "#05873C" }}
          >
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] border-b pb-2" style={{ borderColor: "#05873C40" }}>
              <span>Assinado Eletronicamente</span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
              <div className="min-w-0">
                <div className="opacity-70 text-[10px] uppercase font-semibold">Signatário</div>
                <div className="font-medium text-slate-900 truncate">{contrato.assinatura_nome || "—"}</div>
              </div>
              <div className="min-w-0">
                <div className="opacity-70 text-[10px] uppercase font-semibold">Data e Hora</div>
                <div className="font-medium text-slate-900">{dataAssinatura}</div>
              </div>
              <div className="min-w-0">
                <div className="opacity-70 text-[10px] uppercase font-semibold">IP</div>
                <div className="font-medium text-slate-900">{contrato.assinatura_ip || "—"}</div>
              </div>
              <div className="min-w-0 col-span-2">
                <div className="opacity-70 text-[10px] uppercase font-semibold">Hash de Verificação</div>
                <div className="font-mono text-[9px] break-all text-slate-900 bg-white/50 p-1.5 rounded border border-slate-200 mt-1">
                  {contrato.assinatura_hash || "—"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Field label="Data de assinatura" value="Pendente" />
        )}
        <Field label="Descrição" value={lead?.observacoes} />
        <button
          className="mt-3 hover:underline"
          style={{ fontSize: 13, color: "#1E6FBF" }}
        >
          Editar dados
        </button>
      </Card>

      <CustoViagemCard
        contratoId={contrato.id}
        lojaCidade={loja?.cidade}
        lojaEstado={loja?.estado}
        clienteId={contrato.cliente_id ?? null}
      />

      <ChecklistComercialCard
        contratoId={contrato.id}
        contrato={contrato}
        ambientes={ambientes}
        loja={loja}
        onAvancar={onAvancar}
      />

      <Card title="Estimativa financeira">

        <div className="overflow-hidden rounded-lg" style={{ border: "0.5px solid #E8ECF2" }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#F7F9FC" }}>
                <th
                  className="px-4 py-2 text-left"
                  style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  Item
                </th>
                <th
                  className="px-4 py-2 text-right"
                  style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  Valor previsto
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Produto", produto],
                ["Montagem", montagem],
                ["Frete", frete],
                ["Comissão", comissao],
                ["Outros", outros],
              ].map(([label, value]) => (
                <tr key={label as string} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-4 py-2" style={{ fontSize: 13, color: "#0D1117" }}>
                    {label}
                  </td>
                  <td className="px-4 py-2 text-right" style={{ fontSize: 13, color: "#0D1117" }}>
                    {formatBRL(Number(value))}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: "0.5px solid #E8ECF2", backgroundColor: "#F7F9FC" }}>
                <td className="px-4 py-2" style={{ fontSize: 13, color: "#0D1117", fontWeight: 600 }}>
                  TOTAL
                </td>
                <td className="px-4 py-2 text-right" style={{ fontSize: 13, color: "#0D1117", fontWeight: 600 }}>
                  {formatBRL(total)}
                </td>
              </tr>
              <tr style={{ borderTop: "0.5px solid #E8ECF2" }}>
                <td className="px-4 py-2" style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>
                  Margem
                </td>
                <td
                  className="px-4 py-2 text-right"
                  style={{ fontSize: 13, fontWeight: 600, color: marginColor(margem) }}
                >
                  {margem.toFixed(1).replace(".", ",")}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          className="mt-3 hover:underline"
          style={{ fontSize: 13, color: "#1E6FBF" }}
        >
          Editar custos previstos
        </button>
      </Card>

      <ContractPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        contrato={contrato}
        loja={loja}
        ambientes={ambientes}
        orcamentos={orcamentos}
      />

      <GerarParcelasDialog
        open={parcelasOpen}
        onOpenChange={setParcelasOpen}
        contratoId={contrato.id}
        valorVenda={contrato.valor_venda || 0}
        lojaId={contrato.loja_id}
      />
    </div>
  );
}

function GerarParcelasDialog({ open, onOpenChange, contratoId, valorVenda, lojaId }: { 
  open: boolean; 
  onOpenChange: (v: boolean) => void;
  contratoId: string;
  valorVenda: number;
  lojaId: string;
}) {
  const [total, setTotal] = useState(valorVenda.toString());
  const [entrada, setEntrada] = useState("0");
  const [numParcelas, setNumParcelas] = useState("1");
  const [primeiroVenc, setPrimeiroVenc] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function handleGerar() {
    setLoading(true);
    try {
      const vTotal = Number(total);
      const vEntrada = Number(entrada);
      const nParc = Number(numParcelas);

      if (vTotal <= 0) throw new Error("Valor total deve ser maior que zero");
      if (vEntrada < 0) throw new Error("Entrada não pode ser negativa");
      if (vEntrada >= vTotal) throw new Error("Entrada deve ser menor que o valor total (ou use 0 parcelas)");
      if (nParc < 0) throw new Error("Número de parcelas não pode ser negativo");

      const saldoParaParcelar = vTotal - vEntrada;
      
      // Validação de segurança: se houver saldo, deve haver pelo menos 1 parcela
      if (saldoParaParcelar > 0 && nParc <= 0) {
        throw new Error("Saldo remanescente exige pelo menos 1 parcela.");
      }

      const { data: existing } = await supabase
        .from("financeiro_contas_receber")
        .select("id, status")
        .eq("contrato_id", contratoId)
        .neq("status", "cancelado");

      if (existing && existing.length > 0) {
        const hasPago = existing.some(e => e.status === 'pago');
        if (hasPago) {
          throw new Error("Não é possível regerar parcelas pois já existem parcelas pagas vinculadas a este contrato.");
        }
        if (!confirm("Já existem parcelas ativas para este contrato. Elas serão CANCELADAS para dar lugar às novas. Deseja continuar?")) {
          setLoading(false);
          return;
        }
        // Cancelar as antigas
        await supabase
          .from("financeiro_contas_receber")
          .update({ status: 'cancelado' })
          .eq("contrato_id", contratoId)
          .neq("status", "pago");
      }

      const parcelasInsert = [];
      const loteId = crypto.randomUUID();
      
      // Entrada
      if (vEntrada > 0) {
        parcelasInsert.push({
          descricao: "Entrada",
          valor: vEntrada,
          vencimento: new Date().toISOString().slice(0, 10),
          numero: 0,
          total: nParc
        });
      }

      // Parcelas com ajuste de centavos na última
      if (nParc > 0) {
        const vParcBase = Math.floor((saldoParaParcelar / nParc) * 100) / 100;
        const totalBase = vParcBase * nParc;
        const ajuste = Number((saldoParaParcelar - totalBase).toFixed(2));

        for (let i = 1; i <= nParc; i++) {
          const venc = new Date(primeiroVenc);
          venc.setMonth(venc.getMonth() + i - 1);
          
          const valorFinal = i === nParc ? Number((vParcBase + ajuste).toFixed(2)) : vParcBase;

          parcelasInsert.push({
            descricao: `Parcela ${i}/${nParc}`,
            valor: valorFinal,
            vencimento: venc.toISOString().slice(0, 10),
            numero: i,
            total: nParc
          });
        }
      }

      const { error } = await supabase.rpc('gerar_parcelas_contrato', {
        p_contrato_id: contratoId,
        p_loja_id: lojaId,
        p_parcelas: parcelasInsert,
        p_lote_id: loteId
      });

      if (error) throw error;

      toast.success("Parcelas geradas com sucesso!");
      qc.invalidateQueries({ queryKey: ["contrato_receber", contratoId] });
      qc.invalidateQueries({ queryKey: ["contrato_financeiro_resumo", contratoId] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Gerar Parcelas do Contrato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Valor Total do Contrato</Label>
            <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Valor de Entrada</Label>
            <Input type="number" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nº de Parcelas</Label>
              <Input type="number" value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>1º Vencimento</Label>
              <Input type="date" value={primeiroVenc} onChange={(e) => setPrimeiroVenc(e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600">
            <p>Saldo parcelado: <strong>{((Number(total) - Number(entrada)) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
            <p>Valor por parcela: <strong>{(Number(numParcelas) > 0 ? (Number(total) - Number(entrada)) / Number(numParcelas) : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            className="bg-[#E8A020] hover:bg-[#E8A020]/90 text-white" 
            onClick={handleGerar}
            disabled={loading}
          >
            {loading ? "Gerando..." : "Gerar Parcelas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


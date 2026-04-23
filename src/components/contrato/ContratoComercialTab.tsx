import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { ContractPDF } from "./ContractPDF";
import { ContractPreviewModal } from "./ContractPreviewModal";
import { useState } from "react";

// ... existing code (Card, Field components)

export function ContratoComercialTab({ contrato, loja, ambientes, orcamentos }: ComercialTabProps) {
  const qc = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: vendedor } = useQuery({
    // ... existing code
  });

  const { data: lead } = useQuery({
    // ... existing code
  });

  const { data: dre } = useQuery({
    // ... existing code
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
          <button
            onClick={handleGerarContrato}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-white transition-all hover:opacity-90 active:scale-95"
            style={{ 
              backgroundColor: "#1E6FBF", 
              fontSize: 12, 
              fontWeight: 500,
            }}
          >
            <FileText size={14} />
            Gerar Contrato
          </button>
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
    </div>
  );
}
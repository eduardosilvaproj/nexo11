import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { ContractPDF } from "./ContractPDF";

interface ComercialTabProps {
  contrato: {
    id: string;
    cliente_nome: string;
    cliente_contato: string | null;
    vendedor_id: string | null;
    data_criacao: string;
    assinado: boolean;
    contrato_gerado?: boolean;
    loja_id: string;
    valor_venda?: number;
  };
  loja: any;
  ambientes: any[];
  orcamentos: any[];
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

export function ContratoComercialTab({ contrato, loja, ambientes, orcamentos }: ComercialTabProps) {
  const qc = useQueryClient();

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
      // 1. Marcar contrato_gerado no DB
      const { error: updErr } = await supabase
        .from("contratos")
        .update({ contrato_gerado: true })
        .eq("id", contrato.id);

      if (updErr) throw updErr;

      // 2. Gerar PDF
      const doc = <ContractPDF contrato={contrato as any} loja={loja} ambientes={ambientes} orcamentos={orcamentos} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      
      // 3. Abrir em nova aba para download/impressão
      const win = window.open(url, "_blank");
      if (!win) {
        toast.error("O bloqueador de popups impediu a abertura do contrato. Por favor, habilite popups para este site.");
      } else {
        toast.success("Contrato gerado e disponibilizado para assinatura no Portal do Cliente.");
      }

      // 4. Invalidar queries para atualizar UI
      qc.invalidateQueries({ queryKey: ["contrato_dre_view", contrato.id] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar contrato");
    }
  }

  const produto = Number(dre?.custo_produto_previsto ?? 0);
  const montagem = Number(dre?.custo_montagem_previsto ?? 0);
  const frete = Number(dre?.custo_frete_previsto ?? 0);
  const comissao = Number(dre?.custo_comissao_previsto ?? 0);
  const outros = Number(dre?.outros_custos_previstos ?? 0);
  const total = produto + montagem + frete + comissao + outros;
  const margem = Number(dre?.margem_prevista ?? 0);

  const dataAssinatura = contrato.assinado
    ? new Date(contrato.data_criacao).toLocaleDateString("pt-BR")
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
        <Field label="Data de assinatura" value={dataAssinatura} />
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
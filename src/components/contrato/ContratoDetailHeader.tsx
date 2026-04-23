import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ContractPDF } from "./ContractPDF";
import type { Database } from "@/integrations/supabase/types";

type ContratoStatus = Database["public"]["Enums"]["contrato_status"];

const STATUS_STYLES: Record<ContratoStatus, { bg: string; fg: string; label: string }> = {
  comercial:  { bg: "#E6F3FF", fg: "#1E6FBF", label: "Comercial" },
  tecnico:    { bg: "#EEEDFE", fg: "#534AB7", label: "Técnico" },
  producao:   { bg: "#FAECE7", fg: "#993C1D", label: "Produção" },
  logistica:  { bg: "#D1FAE5", fg: "#05873C", label: "Logística" },
  montagem:   { bg: "#E1F5EE", fg: "#0F6E56", label: "Montagem" },
  pos_venda:  { bg: "#FEF3C7", fg: "#E8A020", label: "Pós-venda" },
  finalizado: { bg: "#D1FAE5", fg: "#05873C", label: "Finalizado" },
};

const NEXT_STAGE: Partial<Record<ContratoStatus, ContratoStatus>> = {
  comercial: "tecnico",
  tecnico: "producao",
  producao: "logistica",
  logistica: "montagem",
  montagem: "pos_venda",
  pos_venda: "finalizado",
};

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
};

const shortNumber = (id: string) => id.slice(0, 6).toUpperCase();

interface ContratoDetailHeaderProps {
  contrato: {
    id: string;
    cliente_nome: string;
    status: ContratoStatus;
    valor_venda: number;
    created_at?: string;
    data_finalizacao?: string | null;
    descricao_ambiente?: string | null;
    loja_id: string;
  };
  loja?: any;
  ambientes?: any[];
  orcamentos?: any[];
  descricao?: string;

  dataPrevista?: string | null;
  travaMensagem?: string | null;
  onAvancar?: () => void;
}

export function ContratoDetailHeader({
  contrato,
  loja,
  ambientes = [],
  orcamentos = [],
  descricao,

  dataPrevista,
  travaMensagem,
  onAvancar,
}: ContratoDetailHeaderProps) {
  const navigate = useNavigate();
  const status = STATUS_STYLES[contrato.status];
  const isFinalizado = contrato.status === "finalizado";
  const proxima = NEXT_STAGE[contrato.status];
  const disabled = !!travaMensagem || !proxima;

  const avancarBtn = (
    <Button
      onClick={onAvancar}
      disabled={disabled}
      className="rounded-lg text-white"
      style={{
        backgroundColor: disabled ? "#B0BAC9" : "#1E6FBF",
      }}
    >
      Avançar etapa
      <ArrowRight className="ml-1" />
    </Button>
  );

  return (
    <div
      className="flex items-center justify-between bg-white"
      style={{ padding: "24px 32px", borderBottom: "0.5px solid #E8ECF2" }}
    >
      {/* LADO ESQUERDO */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/comercial?aba=contratos");
            }
          }}
          className="text-left hover:underline"
          style={{ color: "#6B7A90", fontSize: 13 }}
        >
          ← Voltar
        </button>
        <h1
          style={{ fontSize: 22, fontWeight: 500, color: "#0D1117" }}
        >
          Contrato #{shortNumber(contrato.id)} — {contrato.cliente_nome}
        </h1>
        {(descricao || contrato.descricao_ambiente) && (
          <p style={{ fontSize: 13, color: "#6B7A90" }}>
            {descricao ?? contrato.descricao_ambiente}
          </p>
        )}
      </div>

      {/* LADO DIREITO */}
      <div className="flex items-center gap-4">
        <div className="mr-2">
          <PDFDownloadLink
            document={<ContractPDF contrato={contrato} loja={loja} ambientes={ambientes} orcamentos={orcamentos} />}
            fileName={`contrato_${contrato.id?.slice(0, 8)}.pdf`}
          >
            {({ loading }) => (
              <Button
                variant="outline"
                className="flex items-center gap-2 rounded-lg border-[#1E6FBF] text-[#1E6FBF] hover:bg-[#F5F9FF]"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                Gerar Contrato
              </Button>
            )}
          </PDFDownloadLink>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: status.bg, color: status.fg }}
          >
            {isFinalizado && <Check className="h-3 w-3" />}
            {status.label}
          </span>
          <div style={{ fontSize: 18, fontWeight: 500, color: "#0D1117" }}>
            {formatBRL(contrato.valor_venda)}
          </div>
          <div style={{ fontSize: 12, color: "#6B7A90" }}>
            Data prevista: {formatDate(dataPrevista)}
          </div>
        </div>

        {isFinalizado ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: "#D1FAE5", color: "#05873C" }}
          >
            <Check className="h-4 w-4" />
            Contrato finalizado
          </span>
        ) : disabled && travaMensagem ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{avancarBtn}</span>
            </TooltipTrigger>
            <TooltipContent>{travaMensagem}</TooltipContent>
          </Tooltip>
        ) : (
          avancarBtn
        )}
      </div>
    </div>
  );
}

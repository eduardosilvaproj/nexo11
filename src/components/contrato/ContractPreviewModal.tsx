import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { pdf } from "@react-pdf/renderer";
import { ContractPDF } from "./ContractPDF";
import { ContractHTMLPreview } from "./ContractHTMLPreview";
import { Printer, Download, Send, Loader2, X, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ContractPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: any;
  loja: any;
  ambientes: any[];
  orcamentos: any[];
}

export function ContractPreviewModal({
  open,
  onOpenChange,
  contrato,
  loja,
  ambientes,
  orcamentos,
}: ContractPreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullContrato, setFullContrato] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      if (url) {
        URL.revokeObjectURL(url);
        setUrl(null);
      }
      setFullContrato(null);
      setError(null);
    }
  }, [open]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch full contract and client data
      const { data: realContrato, error: contractError } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", contrato.id)
        .single();

      if (contractError) throw contractError;

      let clienteData = null;
      if (realContrato?.cliente_id) {
        const { data: cli } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", realContrato.cliente_id)
          .single();
        clienteData = cli;
      }

      const mergedContrato = { 
        ...contrato, 
        ...realContrato, 
        cliente: clienteData 
      };

      // Check for required fields as requested by user
      const missingFields = [];
      if (!loja?.nome) missingFields.push("Nome da Loja");
      if (!loja?.cnpj) missingFields.push("CNPJ da Loja");
      if (!mergedContrato.cliente_nome) missingFields.push("Nome do Cliente");
      
      const valorTotal = mergedContrato.valor_venda || mergedContrato.valor_negociado || orcamentos?.[0]?.valor_negociado;
      if (!valorTotal) missingFields.push("Valor do Contrato");

      const parcelas = mergedContrato.parcelas_datas || orcamentos?.[0]?.parcelas_datas;
      if (!parcelas || !Array.isArray(parcelas) || parcelas.length === 0) {
        missingFields.push("Dados de Parcelamento");
      }

      if (missingFields.length > 0) {
        setError(`Os seguintes campos são necessários para gerar o contrato: ${missingFields.join(", ")}`);
      }

      setFullContrato(mergedContrato);

      // Generate PDF in background for download
      generatePdfBlob(mergedContrato);
    } catch (err: any) {
      console.error("Erro ao carregar dados do contrato:", err);
      setError("Não foi possível carregar os dados para a prévia do contrato.");
      toast.error("Erro ao carregar dados do contrato.");
    } finally {
      setLoading(false);
    }
  }

  async function generatePdfBlob(data: any) {
    try {
      const doc = (
        <ContractPDF
          contrato={data}
          loja={loja}
          ambientes={ambientes}
          orcamentos={orcamentos}
        />
      );
      const blob = await pdf(doc).toBlob();
      const newUrl = URL.createObjectURL(blob);
      setUrl(newUrl);
    } catch (err) {
      console.error("Erro ao gerar PDF blob:", err);
      // We don't set error state here because we still have HTML preview
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      const name = fullContrato?.cliente_nome || contrato.cliente_nome || "cliente";
      link.download = `contrato_${name.replace(/\s+/g, "_")}_${contrato.id.slice(0, 8)}.pdf`;
      link.click();
    } else {
      toast.error("PDF ainda está sendo gerado. Tente novamente em instantes.");
      // Fallback: try generating again
      if (fullContrato) generatePdfBlob(fullContrato);
    }
  };

  const handleSendForSignature = async () => {
    try {
      const { data: tokenData } = await supabase
        .from("portal_tokens")
        .select("token")
        .eq("contrato_id", contrato.id)
        .maybeSingle();

      if (!tokenData?.token) {
        toast.error("Link do portal não encontrado.");
        return;
      }

      const portalUrl = `${window.location.origin}/portal/${tokenData.token}`;
      const message = `Olá ${contrato.cliente_nome}, seu contrato está disponível para assinatura: ${portalUrl}`;
      const encodedMessage = encodeURIComponent(message);
      
      // WhatsApp link
      const phone = contrato.cliente_contato?.replace(/\D/g, "");
      if (phone) {
        window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, "_blank");
      } else {
        // Fallback to copy link if no phone
        navigator.clipboard.writeText(message);
        toast.success("Link copiado para a área de transferência!");
      }
    } catch (error) {
      console.error("Erro ao obter link do portal:", error);
      toast.error("Erro ao gerar link de assinatura.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] w-[90vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden; }
            .printable-content, .printable-content * { visibility: visible; }
            .printable-content { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%;
              padding: 0;
              margin: 0;
            }
            .no-print { display: none !important; }
          }
        `}} />
        
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 no-print">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            📄 Preview do Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 bg-slate-100 flex flex-col items-center overflow-y-auto p-4 md:p-8">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <span className="text-sm text-slate-500 font-medium">Carregando contrato...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro na prévia</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : fullContrato ? (
            <div ref={contentRef} className="w-full max-w-[800px]">
              <ContractHTMLPreview
                contrato={fullContrato}
                loja={loja}
                ambientes={ambientes}
                orcamentos={orcamentos}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Falha ao carregar prévia
            </div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-center gap-3 bg-white no-print">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={loading || !!error || !fullContrato}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={loading || !!error}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
          <Button
            onClick={handleSendForSignature}
            disabled={loading || !!error}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Enviar para assinar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


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
import { Printer, Download, Send, Loader2, X } from "lucide-react";
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (open) {
      generatePdf();
    } else {
      if (url) {
        URL.revokeObjectURL(url);
        setUrl(null);
      }
    }
  }, [open]);

  async function generatePdf() {
    setLoading(true);
    try {
      const doc = (
        <ContractPDF
          contrato={contrato}
          loja={loja}
          ambientes={ambientes}
          orcamentos={orcamentos}
        />
      );
      const blob = await pdf(doc).toBlob();
      const newUrl = URL.createObjectURL(blob);
      setUrl(newUrl);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Não foi possível gerar a prévia do contrato.");
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.print();
    }
  };

  const handleDownload = () => {
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `contrato_${contrato.cliente_nome.replace(/\s+/g, "_")}_${contrato.id.slice(0, 8)}.pdf`;
      link.click();
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
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            📄 Preview do Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <span className="text-sm text-slate-500 font-medium">Gerando contrato...</span>
            </div>
          ) : url ? (
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-full border-none"
              title="Preview do Contrato"
            />
          ) : (
            <div className="text-slate-400">Falha ao carregar prévia</div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-center gap-3 bg-white">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!url || loading}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={!url || loading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
          <Button
            onClick={handleSendForSignature}
            disabled={!url || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4" />
            Enviar para assinar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { documentosService, DocumentoInsert } from "@/services/documentosService";

export function useDocumentos() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const emitirDocumento = useCallback(async (documento: DocumentoInsert) => {
    setLoading(true);
    try {
      const data = await documentosService.emitir(documento);
      toast({
        title: "Sucesso",
        description: "Documento emitido com sucesso."
      });
      return data;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao emitir documento.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const cancelarDocumento = useCallback(async (id: string, motivo: string) => {
    setLoading(true);
    try {
      const data = await documentosService.cancelar(id, motivo);
      toast({
        title: "Sucesso",
        description: "Documento cancelado com sucesso."
      });
      return data;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar documento.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    emitirDocumento,
    cancelarDocumento
  };
}

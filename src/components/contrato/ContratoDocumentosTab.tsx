import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Download, 
  Trash2, 
  AlertCircle, 
  Plus,
  Loader2,
  Eye,
  CheckCircle,
  FileCheck
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { useDocumentos } from "@/hooks/useDocumentos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Props {
  contratoId: string;
}

export function ContratoDocumentosTab({ contratoId }: Props) {
  const { roles, perfil } = useAuth();
  const { cancelarDocumento, loading: docLoading } = useDocumentos();
  const qc = useQueryClient();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["contrato_documentos", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_emitidos")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("emitido_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const canCancel = canPerform(roles, "documentos.cancel");

  const handleCancelar = async () => {
    if (!cancelId || !motivo) return;
    try {
      await cancelarDocumento(cancelId, motivo);
      setCancelId(null);
      setMotivo("");
      qc.invalidateQueries({ queryKey: ["contrato_documentos", contratoId] });
      qc.invalidateQueries({ queryKey: ["contrato_eventos", contratoId] });
    } catch (error) {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Documentos Emitidos</h3>
      </div>

      {documentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl py-12 border-2 border-dashed bg-slate-50">
          <FileText className="h-8 w-8 text-slate-300" />
          <span className="text-sm text-slate-500">Este contrato ainda não possui documentos emitidos.</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Título / Nº</th>
                <th className="px-4 py-3">Emitido em</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documentos.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-normal capitalize">
                      {doc.tipo.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{doc.titulo}</div>
                    <div className="text-xs text-slate-500">{doc.numero || doc.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {format(new Date(doc.emitido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    {doc.status === "emitido" ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                        Emitido
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-none">
                        Cancelado
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar">
                        <Eye className="h-4 w-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar">
                        <Download className="h-4 w-4 text-slate-400" />
                      </Button>
                      {doc.status === "emitido" && canCancel && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:text-red-600"
                          onClick={() => setCancelId(doc.id)}
                          title="Cancelar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog de Cancelamento */}
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Documento</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O documento será marcado como cancelado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Motivo do Cancelamento</label>
            <Textarea 
              placeholder="Descreva o motivo..." 
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Voltar</Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelar}
              disabled={!motivo || docLoading}
            >
              {docLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SignaturePad from "./SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface DocumentAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoId: string;
  contratoId?: string;
  documentoTitulo: string;
  onSuccess?: () => void;
}

const DocumentAcceptanceDialog: React.FC<DocumentAcceptanceDialogProps> = ({
  open,
  onOpenChange,
  documentoId,
  contratoId,
  documentoTitulo,
  onSuccess,
}) => {
  const { perfil, user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [tipo, setTipo] = useState("aceite");
  const [observacoes, setObservacoes] = useState("");
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);

  const handleSave = async () => {
    if (!nome) {
      toast.error("Nome do responsável é obrigatório");
      return;
    }

    if (!signatureBase64) {
      toast.error("Assinatura é obrigatória");
      return;
    }

    if (!perfil?.loja_id || !user?.id) return;

    setLoading(true);
    try {
      // 1. Upload signature to storage
      const fileName = `assinatura_${documentoId}_${Date.now()}.png`;
      const filePath = `${perfil.loja_id}/${fileName}`;
      
      const res = await fetch(signatureBase64);
      const blob = await res.blob();
      
      const { error: storageError } = await supabase.storage
        .from("nexo-operacional")
        .upload(filePath, blob);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from("nexo-operacional")
        .getPublicUrl(filePath);

      // 2. Create acceptance record
      const { error: dbError } = await supabase
        .from("documento_aceites")
        .insert({
          loja_id: perfil.loja_id,
          documento_id: documentoId,
          contrato_id: contratoId,
          usuario_id: user.id,
          nome_responsavel: nome,
          documento_responsavel: documento,
          tipo,
          observacoes,
          assinatura_url: publicUrl,
        });

      if (dbError) throw dbError;

      // 3. Update document status
      await supabase
        .from("documentos_emitidos")
        .update({ status: 'aceito' } as any)
        .eq("id", documentoId);

      toast.success("Aceite registrado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["documentos", contratoId] });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao registrar aceite:", error);
      toast.error(`Falha ao registrar aceite: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Aceite: {documentoTitulo}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome do Responsável</Label>
            <Input 
              id="nome" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              placeholder="Nome completo de quem assina"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="doc">Documento (CPF/RG)</Label>
              <Input 
                id="doc" 
                value={documento} 
                onChange={(e) => setDocumento(e.target.value)} 
                placeholder="Opcional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo de Aceite</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aceite">Aceite</SelectItem>
                  <SelectItem value="assinatura_cliente">Assinatura Cliente</SelectItem>
                  <SelectItem value="assinatura_responsavel">Assinatura Resp.</SelectItem>
                  <SelectItem value="recebimento">Recebimento</SelectItem>
                  <SelectItem value="conclusao">Conclusão</SelectItem>
                  <SelectItem value="ressalva">Ressalva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea 
              id="obs" 
              value={observacoes} 
              onChange={(e) => setObservacoes(e.target.value)} 
              placeholder="Alguma observação relevante..."
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label>Assinatura Digital</Label>
            <SignaturePad 
              onSave={(base64) => setSignatureBase64(base64)} 
              onClear={() => setSignatureBase64(null)}
              className="border shadow-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !nome || !signatureBase64}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Aceite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentAcceptanceDialog;
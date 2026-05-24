import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileUp, 
  File, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  ExternalLink, 
  Loader2,
  Clock,
  User as UserIcon
} from "lucide-react";
import { useOperationalAttachments, AnexoOperacional } from "@/hooks/useOperationalAttachments";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OperationalAttachmentsProps {
  contratoId?: string;
  modulo?: string;
  entidadeId?: string;
  entidadeTipo?: string;
  documentoId?: string;
  title?: string;
  allowUpload?: boolean;
}

const OperationalAttachments: React.FC<OperationalAttachmentsProps> = ({
  contratoId,
  modulo,
  entidadeId,
  entidadeTipo = "contrato",
  documentoId,
  title = "Anexos e Evidências",
  allowUpload = true,
}) => {
  const { fetchAttachments, uploadFile, deleteAttachment, uploading } = useOperationalAttachments(contratoId);
  const [attachments, setAttachments] = useState<AnexoOperacional[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadAttachments = async () => {
    setLoading(true);
    const data = await fetchAttachments({ modulo, entidade_id: entidadeId, documento_id: documentoId });
    setAttachments(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAttachments();
  }, [contratoId, modulo, entidadeId, documentoId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Limite: 10MB");
      return;
    }

    const res = await uploadFile({
      file,
      modulo: modulo || "contrato",
      titulo: file.name,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      documento_id: documentoId,
    });

    if (res) {
      loadAttachments();
    }
    
    // Reset input
    e.target.value = "";
  };

  const isImage = (mime?: string) => mime?.startsWith("image/");

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {allowUpload && (
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              accept="image/*,application/pdf"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              Anexar
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg bg-gray-50/50">
            <File className="w-10 h-10 text-muted-foreground mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">Nenhum anexo encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {attachments.map((anexo) => (
              <Card key={anexo.id} className="overflow-hidden border border-gray-100 group">
                <div className="relative aspect-video bg-gray-50 flex items-center justify-center border-b">
                  {isImage(anexo.mime_type) ? (
                    <img 
                      src={anexo.arquivo_url} 
                      alt={anexo.titulo} 
                      className="object-cover w-full h-full cursor-pointer transition-transform group-hover:scale-105"
                      onClick={() => setPreviewUrl(anexo.arquivo_url)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <File className="w-10 h-10 text-blue-500/50" />
                      <span className="text-xs font-medium uppercase text-muted-foreground">{anexo.mime_type?.split('/')[1] || 'DOC'}</span>
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="w-8 h-8 rounded-full shadow-lg"
                      asChild
                    >
                      <a href={anexo.arquivo_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="w-8 h-8 rounded-full shadow-lg"
                      onClick={() => {
                        if (confirm("Deseja realmente excluir este anexo?")) {
                          deleteAttachment(anexo.id, anexo.arquivo_url).then(() => loadAttachments());
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-semibold truncate flex-1 pr-2" title={anexo.titulo}>{anexo.titulo}</h4>
                    <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize">
                      {anexo.modulo}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(anexo.created_at), "dd MMM yyyy HH:mm", { locale: ptBR })}
                    </div>
                    {anexo.tipo && (
                      <span className="capitalize">Tipo: {anexo.tipo}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default OperationalAttachments;
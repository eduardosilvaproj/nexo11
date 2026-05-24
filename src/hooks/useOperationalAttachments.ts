import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export interface AnexoOperacional {
  id: string;
  loja_id: string;
  contrato_id?: string;
  documento_id?: string;
  entidade_tipo: string;
  entidade_id?: string;
  modulo: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  arquivo_url: string;
  mime_type?: string;
  tamanho_bytes?: number;
  enviado_por?: string;
  created_at: string;
}

export function useOperationalAttachments(contratoId?: string) {
  const { perfil, user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const fetchAttachments = async (filters?: { modulo?: string; entidade_id?: string; documento_id?: string }) => {
    let query = supabase
      .from("anexos_operacionais")
      .select("*")
      .order("created_at", { ascending: false });

    if (contratoId) {
      query = query.eq("contrato_id", contratoId);
    }

    if (filters?.modulo) {
      query = query.eq("modulo", filters.modulo);
    }
    
    if (filters?.entidade_id) {
      query = query.eq("entidade_id", filters.entidade_id);
    }

    if (filters?.documento_id) {
      query = query.eq("documento_id", filters.documento_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao buscar anexos:", error);
      return [];
    }
    return data as AnexoOperacional[];
  };

  const uploadFile = async (params: {
    file: File | string; // File object or base64 string
    modulo: string;
    titulo: string;
    entidade_tipo: string;
    entidade_id?: string;
    documento_id?: string;
    tipo?: string;
    descricao?: string;
  }) => {
    if (!perfil?.loja_id || !user?.id) {
      toast.error("Usuário não autenticado ou sem loja vinculada");
      return null;
    }

    setUploading(true);
    try {
      let fileData: Blob | File;
      let fileName: string;
      let mimeType: string;

      if (typeof params.file === 'string') {
        // Handle base64 (signature)
        const res = await fetch(params.file);
        fileData = await res.blob();
        fileName = `assinatura_${Date.now()}.png`;
        mimeType = 'image/png';
      } else {
        fileData = params.file;
        fileName = `${Date.now()}_${params.file.name}`;
        mimeType = params.file.type;
      }

      const filePath = `${perfil.loja_id}/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from("nexo-operacional")
        .upload(filePath, fileData);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from("nexo-operacional")
        .getPublicUrl(filePath);

      const { data: anexo, error: dbError } = await supabase
        .from("anexos_operacionais")
        .insert({
          loja_id: perfil.loja_id,
          contrato_id: contratoId,
          documento_id: params.documento_id,
          entidade_tipo: params.entidade_tipo,
          entidade_id: params.entidade_id,
          modulo: params.modulo,
          tipo: params.tipo || 'arquivo',
          titulo: params.titulo,
          descricao: params.descricao,
          arquivo_url: publicUrl,
          mime_type: mimeType,
          tamanho_bytes: fileData.size,
          enviado_por: user.id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["anexos", contratoId] });
      toast.success("Arquivo enviado com sucesso");
      return anexo;
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error(`Falha no upload: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (id: string, url: string) => {
    try {
      // Extract path from public URL
      const path = url.split("nexo-operacional/")[1];
      if (path) {
        await supabase.storage.from("nexo-operacional").remove([path]);
      }

      const { error } = await supabase
        .from("anexos_operacionais")
        .delete()
        .eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["anexos", contratoId] });
      toast.success("Anexo excluído");
      return true;
    } catch (error: any) {
      console.error("Erro ao excluir anexo:", error);
      toast.error("Falha ao excluir anexo");
      return false;
    }
  };

  return {
    uploading,
    uploadFile,
    fetchAttachments,
    deleteAttachment
  };
}
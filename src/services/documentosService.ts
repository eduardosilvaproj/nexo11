import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type DocumentoEmitido = Database["public"]["Tables"]["documentos_emitidos"]["Row"];
export type DocumentoInsert = Database["public"]["Tables"]["documentos_emitidos"]["Insert"];

export const documentosService = {
  async listarPorContrato(contratoId: string) {
    const { data, error } = await supabase
      .from("documentos_emitidos")
      .select("*")
      .eq("contrato_id", contratoId)
      .order("emitido_em", { ascending: false });

    if (error) throw error;
    return data;
  },

  async listarPorEntidade(entidadeTipo: string, entidadeId: string) {
    const { data, error } = await supabase
      .from("documentos_emitidos")
      .select("*")
      .eq("entidade_tipo", entidadeTipo)
      .eq("entidade_id", entidadeId)
      .order("emitido_em", { ascending: false });

    if (error) throw error;
    return data;
  },

  async emitir(documento: DocumentoInsert) {
    const { data, error } = await supabase
      .from("documentos_emitidos")
      .insert(documento)
      .select()
      .single();

    if (error) throw error;

    // Registrar na linha do tempo se houver contrato
    if (documento.contrato_id) {
      await supabase.from("contrato_eventos").insert({
        contrato_id: documento.contrato_id,
        tipo: "documento_emitido",
        titulo: `Documento emitido: ${documento.titulo}`,
        descricao: `Tipo: ${documento.tipo}`,
        metadata: { documento_id: data.id, tipo_documento: documento.tipo }
      });
    }

    return data;
  },

  async cancelar(id: string, motivo: string) {
    const { data: doc, error: fetchError } = await supabase
      .from("documentos_emitidos")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from("documentos_emitidos")
      .update({
        status: "cancelado",
        cancelado_em: new Date().toISOString(),
        motivo_cancelamento: motivo
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Registrar na linha do tempo se houver contrato
    if (doc.contrato_id) {
      await supabase.from("contrato_eventos").insert({
        contrato_id: doc.contrato_id,
        tipo: "documento_cancelado",
        titulo: `Documento cancelado: ${doc.titulo}`,
        descricao: `Motivo: ${motivo}`,
        metadata: { documento_id: id, tipo_documento: doc.tipo }
      });
    }

    return data;
  }
};

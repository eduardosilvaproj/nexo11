import { supabase } from "@/integrations/supabase/client";

export type EventModulo = 
  | "comercial"
  | "tecnico"
  | "compras"
  | "almoxarifado"
  | "logistica"
  | "montagem"
  | "financeiro"
  | "comissoes"
  | "pos_venda";

export interface ContratoEventoParams {
  contratoId: string;
  tipo: string;
  modulo: EventModulo;
  titulo: string;
  descricao?: string | null;
  entidadeTipo?: string | null;
  entidadeId?: string | null;
  metadata?: Record<string, any>;
}

export const registrarEventoContrato = async (params: ContratoEventoParams) => {
  try {
    // Buscar loja_id do contrato para garantir integridade
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos" as any)
      .select("loja_id")
      .eq("id", params.contratoId)
      .single();

    if (contratoError) throw contratoError;

    const { error } = await supabase.from("contrato_eventos" as any).insert({
      contrato_id: params.contratoId,
      loja_id: (contrato as any).loja_id,
      tipo: params.tipo,
      modulo: params.modulo,
      titulo: params.titulo,
      descricao: params.descricao,
      entidade_tipo: params.entidadeTipo,
      entidade_id: params.entidadeId,
      metadata: params.metadata || {},
      usuario_id: (await supabase.auth.getUser()).data.user?.id
    });

    if (error) {
      console.error("Erro ao registrar evento do contrato:", error);
    }
  } catch (error) {
    console.error("Erro ao registrar evento do contrato:", error);
  }
};

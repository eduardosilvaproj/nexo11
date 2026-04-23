import { supabase } from "@/integrations/supabase/client";

export async function gerarContrato(contratoId: string) {
  // 1. Busca o contrato
  const { data: contrato, error: contratoError } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", contratoId)
    .maybeSingle();

  if (contratoError) {
    console.error("Erro ao buscar contrato:", contratoError);
    throw new Error(`Erro ao buscar contrato: ${contratoError.message}`);
  }

  if (!contrato) {
    throw new Error("Contrato não encontrado");
  }

  // 2. Busca cliente, loja e orçamentos em paralelo
  // Usamos Promise.all para otimizar o tempo de resposta
  const [clienteRes, lojaRes, orcamentosRes] = await Promise.all([
    contrato.cliente_id 
      ? supabase.from("clientes").select("*").eq("id", contrato.cliente_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("lojas").select("*").eq("id", contrato.loja_id).maybeSingle(),
    supabase.from("orcamentos").select("*").eq("contrato_id", contratoId)
  ]);

  if (clienteRes.error) {
    console.error("Erro ao buscar cliente:", clienteRes.error);
  }
  
  if (lojaRes.error) {
    console.error("Erro ao buscar loja:", lojaRes.error);
  }

  if (orcamentosRes.error) {
    console.error("Erro ao buscar orçamentos:", orcamentosRes.error);
  }

  return {
    contrato,
    cliente: clienteRes.data,
    loja: lojaRes.data,
    orcamentos: orcamentosRes.data || []
  };
}

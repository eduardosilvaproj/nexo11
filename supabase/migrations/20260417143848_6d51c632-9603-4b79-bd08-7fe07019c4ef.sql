-- 1) View consolidada Contrato + DRE
CREATE OR REPLACE VIEW public.vw_contratos_dre
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.loja_id,
  c.cliente_nome,
  c.cliente_contato,
  c.vendedor_id,
  c.status,
  c.valor_venda,
  c.assinado,
  c.data_criacao,
  c.data_finalizacao,
  c.created_at,
  c.updated_at,
  d.custo_produto_previsto,
  d.custo_produto_real,
  d.custo_montagem_previsto,
  d.custo_montagem_real,
  d.custo_frete_previsto,
  d.custo_frete_real,
  d.custo_comissao_previsto,
  d.custo_comissao_real,
  d.outros_custos_previstos,
  d.outros_custos_reais,
  d.margem_prevista,
  d.margem_realizada,
  d.desvio_total,
  d.updated_at AS dre_updated_at
FROM public.contratos c
LEFT JOIN public.dre_contrato d ON d.contrato_id = c.id;

-- 2) Função para avançar etapa do contrato (respeita as travas em contrato_travas_etapa)
CREATE OR REPLACE FUNCTION public.avancar_contrato(
  p_contrato_id uuid,
  p_usuario_id  uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  cur  public.contrato_status;
  prox public.contrato_status;
  upd  public.contrato_status;
BEGIN
  SELECT status INTO cur FROM public.contratos WHERE id = p_contrato_id;
  IF cur IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Contrato não encontrado');
  END IF;

  prox := CASE cur
    WHEN 'comercial'  THEN 'tecnico'::public.contrato_status
    WHEN 'tecnico'    THEN 'producao'::public.contrato_status
    WHEN 'producao'   THEN 'logistica'::public.contrato_status
    WHEN 'logistica'  THEN 'montagem'::public.contrato_status
    WHEN 'montagem'   THEN 'pos_venda'::public.contrato_status
    WHEN 'pos_venda'  THEN 'finalizado'::public.contrato_status
    ELSE NULL
  END;

  IF prox IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Contrato já finalizado');
  END IF;

  BEGIN
    UPDATE public.contratos SET status = prox WHERE id = p_contrato_id
    RETURNING status INTO upd;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'erro', SQLERRM);
  END;

  RETURN jsonb_build_object('ok', true, 'status_novo', upd, 'status_anterior', cur);
END;
$$;

-- 3) Realtime para a faixa de DRE
ALTER PUBLICATION supabase_realtime ADD TABLE public.dre_contrato;
ALTER TABLE public.dre_contrato REPLICA IDENTITY FULL;
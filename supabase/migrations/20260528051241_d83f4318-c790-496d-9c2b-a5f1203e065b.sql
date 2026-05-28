-- Backfill contratos antigos
UPDATE public.contratos SET status = 'conferencia'::public.contrato_status
  WHERE status = 'tecnico'::public.contrato_status AND sub_etapa_tecnico = 'conferencia';
UPDATE public.contratos SET status = 'medicao'::public.contrato_status
  WHERE status = 'tecnico'::public.contrato_status;
UPDATE public.contratos SET status = 'entrada'::public.contrato_status
  WHERE status = 'logistica'::public.contrato_status;

-- Rewrite avancar_contrato para novo fluxo
CREATE OR REPLACE FUNCTION public.avancar_contrato(
  p_contrato_id uuid,
  p_usuario_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  c    public.contratos%ROWTYPE;
  prox public.contrato_status;
  upd  public.contrato_status;
  uid  uuid := auth.uid();
BEGIN
  SELECT * INTO c FROM public.contratos WHERE id = p_contrato_id;
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Contrato não encontrado');
  END IF;

  IF NOT (
    public.has_role(uid, 'admin'::app_role)
    OR public.has_role(uid, 'franqueador'::app_role)
    OR c.loja_id = public.current_loja_id()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem permissão para este contrato');
  END IF;

  prox := CASE c.status
    WHEN 'comercial'   THEN 'medicao'::public.contrato_status
    WHEN 'medicao'     THEN 'conferencia'::public.contrato_status
    WHEN 'conferencia' THEN 'implantacao'::public.contrato_status
    WHEN 'implantacao' THEN 'producao'::public.contrato_status
    WHEN 'producao'    THEN 'entrada'::public.contrato_status
    WHEN 'entrada'     THEN 'montagem'::public.contrato_status
    WHEN 'montagem'    THEN 'pos_venda'::public.contrato_status
    WHEN 'pos_venda'   THEN 'finalizado'::public.contrato_status
    -- compat legados
    WHEN 'tecnico'     THEN 'producao'::public.contrato_status
    WHEN 'logistica'   THEN 'montagem'::public.contrato_status
    ELSE NULL
  END;

  IF prox IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Contrato já finalizado');
  END IF;

  -- Gates de trava por etapa de origem
  IF c.status = 'comercial' THEN
    IF NOT c.assinado OR COALESCE(c.valor_venda,0) <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Contrato precisa estar assinado e ter valor de venda configurado');
    END IF;
  ELSIF c.status = 'medicao' THEN
    IF NOT COALESCE(c.trava_medicao_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Medição precisa estar 100% concluída');
    END IF;
  ELSIF c.status = 'conferencia' THEN
    IF NOT COALESCE(c.trava_conferencia_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Conferência precisa ser aprovada antes de avançar');
    END IF;
  ELSIF c.status = 'implantacao' THEN
    IF NOT COALESCE(c.trava_implantacao_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Financeiro precisa validar pagamento à fábrica');
    END IF;
  ELSIF c.status = 'producao' THEN
    IF NOT COALESCE(c.trava_producao_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Produção precisa estar concluída');
    END IF;
  ELSIF c.status = 'entrada' THEN
    IF NOT COALESCE(c.trava_entrada_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Material recebido precisa ser conferido antes de montar');
    END IF;
  ELSIF c.status = 'montagem' THEN
    IF NOT COALESCE(c.trava_montagem_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Montagem precisa estar concluída');
    END IF;
  END IF;

  BEGIN
    UPDATE public.contratos SET status = prox WHERE id = p_contrato_id
    RETURNING status INTO upd;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'erro', SQLERRM);
  END;

  RETURN jsonb_build_object('ok', true, 'status_novo', upd, 'status_anterior', c.status);
END;
$function$;
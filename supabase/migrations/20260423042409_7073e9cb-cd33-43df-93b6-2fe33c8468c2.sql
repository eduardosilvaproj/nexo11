CREATE OR REPLACE FUNCTION public.portal_assinar_contrato(_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contrato_id UUID;
  _cliente_nome TEXT;
BEGIN
  -- 1. Validar token e pegar ID do contrato
  SELECT contrato_id INTO _contrato_id
  FROM portal_tokens
  WHERE token = _token AND expirado = false;

  IF _contrato_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Token inválido ou expirado');
  END IF;

  -- 2. Pegar nome do cliente para log
  SELECT cliente_nome INTO _cliente_nome FROM contratos WHERE id = _contrato_id;

  -- 3. Atualizar contrato
  UPDATE contratos
  SET 
    assinado = true,
    data_assinatura = now()
  WHERE id = _contrato_id;

  -- 4. Registrar log
  INSERT INTO contrato_logs (contrato_id, acao, titulo, descricao)
  VALUES (
    _contrato_id,
    'contrato_assinado',
    'Contrato assinado pelo cliente',
    'Contrato assinado via Portal do Cliente por ' || COALESCE(_cliente_nome, 'cliente')
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;
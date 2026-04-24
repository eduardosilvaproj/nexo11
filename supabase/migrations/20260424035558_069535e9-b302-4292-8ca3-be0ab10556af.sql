CREATE OR REPLACE FUNCTION public.portal_assinar_contrato(
  _token uuid, 
  _nome text, 
  _ip text, 
  _user_agent text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _contrato_id UUID;
  _cliente_nome TEXT;
  _vendedor_id UUID;
  _data TIMESTAMP WITH TIME ZONE;
  _hash_backend TEXT;
BEGIN
  -- 1. Validar token e pegar ID do contrato e Vendedor
  SELECT id, cliente_nome, vendedor_id INTO _contrato_id, _cliente_nome, _vendedor_id
  FROM contratos
  WHERE id = (SELECT contrato_id FROM portal_tokens WHERE token = _token AND expirado = false);

  IF _contrato_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Token inválido ou expirado');
  END IF;

  -- 2. Definir a data da assinatura
  _data := now();

  -- 3. Gerar hash SHA-256
  _hash_backend := upper(encode(digest(_contrato_id::text || '|' || _nome || '|' || _ip || '|' || to_char(_data, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'sha256'), 'hex'));

  -- 4. Atualizar contrato
  UPDATE contratos
  SET 
    assinado = true,
    data_assinatura = _data,
    assinatura_nome = _nome,
    assinatura_ip = _ip,
    assinatura_user_agent = _user_agent,
    assinatura_hash = _hash_backend
  WHERE id = _contrato_id;

  -- 5. Registrar log
  INSERT INTO contrato_logs (contrato_id, acao, titulo, descricao)
  VALUES (
    _contrato_id,
    'contrato_assinado',
    'Contrato assinado pelo cliente',
    'Contrato assinado via Portal do Cliente por ' || _nome || ' (IP: ' || _ip || ').'
  );

  -- 6. Notificar Vendedor (ERP)
  IF _vendedor_id IS NOT NULL THEN
    INSERT INTO notificacoes (user_id, contrato_id, tipo, mensagem, link)
    VALUES (
      _vendedor_id,
      _contrato_id,
      'contrato_assinado',
      _cliente_nome || ' assinou o contrato #' || upper(left(_contrato_id::text, 8)),
      '/comercial?id=' || _contrato_id
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 
    'hash', _hash_backend,
    'data_assinatura', _data,
    'contrato_id', _contrato_id
  );
END;
$function$;

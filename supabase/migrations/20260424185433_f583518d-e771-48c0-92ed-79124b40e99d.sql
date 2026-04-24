CREATE OR REPLACE FUNCTION public.portal_assinar_contrato(
  _token text,
  _nome text,
  _ip text,
  _user_agent text,
  _assinatura_imagem_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contrato_id uuid;
  v_hash text;
  v_now timestamptz;
BEGIN
  -- Verificar token
  SELECT contrato_id INTO v_contrato_id
  FROM portal_tokens
  WHERE token = _token AND expires_at > now();

  IF v_contrato_id IS NULL THEN
    RETURN json_build_object('ok', false, 'erro', 'Token inválido ou expirado');
  END IF;

  v_now := now();
  -- Gerar um hash SHA-256 para validade jurídica (usando campos do contrato + dados da assinatura)
  v_hash := encode(digest(v_contrato_id::text || _nome || _ip || v_now::text, 'sha256'), 'hex');

  -- Atualizar contrato
  UPDATE contratos
  SET 
    assinado = true,
    assinado_em = v_now,
    assinado_nome = _nome,
    assinado_ip = _ip,
    assinado_user_agent = _user_agent,
    assinatura_hash = v_hash,
    assinatura_imagem_url = _assinatura_imagem_url,
    status = 'tecnico' -- Avança para Revisão Técnica após assinar
  WHERE id = v_contrato_id;

  -- Registrar log
  INSERT INTO contrato_logs (contrato_id, etapa, descricao, responsavel)
  VALUES (v_contrato_id, 'comercial', 'Contrato assinado digitalmente pelo cliente: ' || _nome, 'Portal do Cliente');

  RETURN json_build_object(
    'ok', true, 
    'hash', v_hash, 
    'data_assinatura', v_now,
    'contrato_id', v_contrato_id
  );
END;
$$;
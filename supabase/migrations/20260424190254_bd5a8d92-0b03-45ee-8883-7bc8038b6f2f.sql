CREATE OR REPLACE FUNCTION public.portal_assinar_contrato(
  _token text,
  _nome text,
  _ip text,
  _user_agent text,
  _assinatura_imagem_url text,
  _hash text DEFAULT NULL,
  _data_assinatura timestamptz DEFAULT now()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contrato_id uuid;
  v_cliente_id uuid;
  v_hash text;
  v_data_assinatura timestamptz;
BEGIN
  -- Validar token e obter contrato
  SELECT contrato_id INTO v_contrato_id
  FROM public.portal_tokens
  WHERE token = _token AND (expires_at IS NULL OR expires_at > now());

  IF v_contrato_id IS NULL THEN
    RETURN json_build_object('ok', false, 'erro', 'Token inválido ou expirado');
  END IF;

  -- Usar hash e data fornecidos ou gerar/usar padrão
  v_hash := COALESCE(_hash, encode(digest(v_contrato_id::text || _nome || now()::text, 'sha256'), 'hex'));
  v_data_assinatura := COALESCE(_data_assinatura, now());

  -- Atualizar contrato
  UPDATE public.contratos
  SET 
    assinado = true,
    assinado_em = v_data_assinatura,
    assinado_nome = _nome,
    assinado_ip = _ip,
    assinado_user_agent = _user_agent,
    assinatura_hash = v_hash,
    assinatura_imagem_url = _assinatura_imagem_url,
    status = CASE WHEN status = 'comercial' THEN 'tecnico' ELSE status END
  WHERE id = v_contrato_id;

  -- Log
  INSERT INTO public.contrato_logs (contrato_id, etapa, descricao)
  VALUES (v_contrato_id, 'comercial', 'Contrato assinado digitalmente por ' || _nome);

  RETURN json_build_object(
    'ok', true, 
    'hash', v_hash, 
    'data_assinatura', v_data_assinatura,
    'contrato_id', v_contrato_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok', false, 'erro', SQLERRM);
END;
$$;
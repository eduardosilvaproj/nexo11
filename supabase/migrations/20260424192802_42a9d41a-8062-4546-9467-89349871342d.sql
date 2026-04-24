-- First ensure the table has the default value for acao
ALTER TABLE public.contrato_logs 
ALTER COLUMN acao SET DEFAULT 'acao_sistema';

-- Update the function to explicitly provide 'acao' and use consistent column names
CREATE OR REPLACE FUNCTION public.portal_assinar_contrato(
  _token text, 
  _nome text, 
  _ip text, 
  _user_agent text, 
  _assinatura_imagem_url text, 
  _hash text DEFAULT NULL::text, 
  _data_assinatura timestamp with time zone DEFAULT now()
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contrato_id uuid;
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

  -- Usar hash e data do frontend se fornecidos, senão gerar/usar agora
  v_hash := COALESCE(_hash, encode(digest(v_contrato_id::text || _nome || _ip || now()::text, 'sha256'), 'hex'));
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
    status = 'tecnico' -- Avança para Revisão Técnica após assinar
  WHERE id = v_contrato_id;

  -- Registrar log com todos os campos necessários
  -- Notar que usamos 'etapa', 'descricao', 'usuario_nome' (conforme solicitado anteriormente)
  -- E agora incluímos 'acao' explicitamente
  INSERT INTO public.contrato_logs (
    contrato_id, 
    acao, 
    etapa, 
    descricao, 
    usuario_nome,
    created_at
  )
  VALUES (
    v_contrato_id, 
    'assinatura_digital', 
    'assinatura', 
    'Contrato assinado digitalmente pelo cliente: ' || _nome, 
    _nome,
    v_data_assinatura
  );

  RETURN json_build_object(
    'ok', true, 
    'hash', v_hash, 
    'data_assinatura', v_data_assinatura,
    'contrato_id', v_contrato_id
  );
END;
$function$;
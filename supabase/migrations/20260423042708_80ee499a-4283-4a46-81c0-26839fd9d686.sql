-- Adicionar colunas para assinatura eletrônica
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS assinatura_nome TEXT,
ADD COLUMN IF NOT EXISTS assinatura_ip TEXT,
ADD COLUMN IF NOT EXISTS assinatura_hash TEXT;

-- Atualizar a função de assinatura para aceitar novos parâmetros
CREATE OR REPLACE FUNCTION public.portal_assinar_contrato(_token uuid, _nome text, _ip text, _hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _contrato_id UUID;
BEGIN
  -- 1. Validar token e pegar ID do contrato
  SELECT contrato_id INTO _contrato_id
  FROM portal_tokens
  WHERE token = _token AND expirado = false;

  IF _contrato_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Token inválido ou expirado');
  END IF;

  -- 2. Atualizar contrato
  UPDATE contratos
  SET 
    assinado = true,
    data_assinatura = now(),
    assinatura_nome = _nome,
    assinatura_ip = _ip,
    assinatura_hash = _hash
  WHERE id = _contrato_id;

  -- 3. Registrar log
  INSERT INTO contrato_logs (contrato_id, acao, titulo, descricao)
  VALUES (
    _contrato_id,
    'contrato_assinado',
    'Contrato assinado pelo cliente',
    'Contrato assinado via Portal do Cliente por ' || _nome || ' (IP: ' || _ip || ')'
  );

  RETURN jsonb_build_object('ok', true);
END;
$function$;

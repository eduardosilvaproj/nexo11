-- Garantir que a extensão pgcrypto está disponível
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Remover a função anterior para permitir a mudança de nomes de parâmetros
DROP FUNCTION IF EXISTS public.portal_assinar_contrato(uuid, text, text, text);

-- Atualizar a função de assinatura para gerar o hash no backend
CREATE OR REPLACE FUNCTION public.portal_assinar_contrato(_token uuid, _nome text, _ip text, _hash_frontend text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _contrato_id UUID;
  _data TIMESTAMP WITH TIME ZONE;
  _hash_backend TEXT;
BEGIN
  -- 1. Validar token e pegar ID do contrato
  SELECT contrato_id INTO _contrato_id
  FROM portal_tokens
  WHERE token = _token AND expirado = false;

  IF _contrato_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Token inválido ou expirado');
  END IF;

  -- 2. Definir a data da assinatura (momento atual no servidor)
  _data := now();

  -- 3. Gerar hash SHA-256 no backend para auditoria
  -- Concatenamos os campos conforme solicitado: contrato, nome, IP e data
  -- Usamos o formato ISO8601 para a data para consistência
  _hash_backend := upper(encode(digest(_contrato_id::text || '|' || _nome || '|' || _ip || '|' || to_char(_data, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'sha256'), 'hex'));

  -- 4. Atualizar contrato com os dados validados
  UPDATE contratos
  SET 
    assinado = true,
    data_assinatura = _data,
    assinatura_nome = _nome,
    assinatura_ip = _ip,
    assinatura_hash = _hash_backend -- Priorizamos o hash gerado no backend
  WHERE id = _contrato_id;

  -- 5. Registrar log detalhado
  INSERT INTO contrato_logs (contrato_id, acao, titulo, descricao)
  VALUES (
    _contrato_id,
    'contrato_assinado',
    'Contrato assinado pelo cliente',
    'Contrato assinado via Portal do Cliente por ' || _nome || ' (IP: ' || _ip || '). Autenticidade verificada via hash SHA-256.'
  );

  RETURN jsonb_build_object(
    'ok', true, 
    'hash', _hash_backend,
    'data_assinatura', _data
  );
END;
$function$;

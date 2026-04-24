-- Drop the old versions of the function to avoid conflicts
DROP FUNCTION IF EXISTS public.portal_assinar_contrato(uuid);
DROP FUNCTION IF EXISTS public.portal_assinar_contrato(uuid, text, text, text);

-- Add new columns to contratos table
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS assinatura_user_agent TEXT,
ADD COLUMN IF NOT EXISTS url_contrato_assinado TEXT;

-- Create storage bucket for signed contracts if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contratos-assinados', 'contratos-assinados', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the new bucket
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Public Access" 
        ON storage.objects FOR SELECT 
        USING (bucket_id = 'contratos-assinados');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Upload' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Authenticated Upload" 
        ON storage.objects FOR INSERT 
        WITH CHECK (bucket_id = 'contratos-assinados');
    END IF;
END $$;

-- Update the portal_assinar_contrato function
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

  RETURN jsonb_build_object(
    'ok', true, 
    'hash', _hash_backend,
    'data_assinatura', _data,
    'contrato_id', _contrato_id
  );
END;
$function$;

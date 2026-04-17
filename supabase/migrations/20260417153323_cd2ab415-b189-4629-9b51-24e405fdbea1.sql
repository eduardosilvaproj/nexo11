-- Habilitar RLS em realtime.messages (controla quem pode assinar canais)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas, se existirem
DROP POLICY IF EXISTS "Realtime: assinar canal de contrato da loja" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime: receber eventos de contrato da loja" ON realtime.messages;

-- Função helper: extrai contrato_id de um nome de canal "contrato:<uuid>"
CREATE OR REPLACE FUNCTION public.realtime_canal_contrato_permitido(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _topic IS NULL OR position('contrato:' in _topic) <> 1 THEN
    RETURN false;
  END IF;
  BEGIN
    _id := substring(_topic from 10)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  RETURN public.contrato_da_loja(_id)
      OR public.has_role(auth.uid(), 'franqueador'::app_role);
END;
$$;

-- Permite SELECT (receber eventos) somente para canais de contratos da loja do usuário
CREATE POLICY "Realtime: receber eventos de contrato da loja"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.realtime_canal_contrato_permitido(topic));

-- Permite INSERT (assinar/broadcast) somente para canais de contratos da loja
CREATE POLICY "Realtime: assinar canal de contrato da loja"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.realtime_canal_contrato_permitido(topic));
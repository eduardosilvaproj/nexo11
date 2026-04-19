
-- Tabela portal_acessos: códigos de 6 dígitos para acesso ao portal
CREATE TABLE IF NOT EXISTS public.portal_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (codigo)
);

CREATE INDEX IF NOT EXISTS idx_portal_acessos_cliente ON public.portal_acessos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_portal_acessos_token ON public.portal_acessos(token);

ALTER TABLE public.portal_acessos ENABLE ROW LEVEL SECURITY;

-- Authenticated: gerentes/admin/vendedor da loja podem criar e ver
CREATE POLICY "Portal acessos visíveis por loja"
  ON public.portal_acessos FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    ))
  );

CREATE POLICY "Portal acessos insert por papéis"
  ON public.portal_acessos FOR INSERT TO authenticated
  WITH CHECK (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    )
  );

CREATE POLICY "Portal acessos delete por admin/gerente"
  ON public.portal_acessos FOR DELETE TO authenticated
  USING (
    loja_id = current_loja_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  );

-- RPC pública: validar código de 6 dígitos e retornar token
CREATE OR REPLACE FUNCTION public.portal_validar_codigo(_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
BEGIN
  IF _codigo IS NULL OR length(trim(_codigo)) <> 6 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Código inválido');
  END IF;

  SELECT pa.token, pa.contrato_id, pa.cliente_id, pa.expires_at
    INTO _row
    FROM public.portal_acessos pa
   WHERE pa.codigo = trim(_codigo)
     AND pa.expires_at > now()
   LIMIT 1;

  IF _row.token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Código não encontrado ou expirado');
  END IF;

  RETURN jsonb_build_object('ok', true, 'token', _row.token, 'contrato_id', _row.contrato_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_validar_codigo(text) TO anon, authenticated;

-- Permitir leitura via portal token: orcamentos do cliente vinculado ao contrato
CREATE POLICY "Anon pode ler orcamentos com token válido"
  ON public.orcamentos FOR SELECT TO anon
  USING (
    contrato_id IS NOT NULL
    AND contrato_id = portal_token_contrato_id()
  );

-- Permitir cliente aprovar/recusar orçamento via portal
CREATE POLICY "Anon pode atualizar status orcamento com token"
  ON public.orcamentos FOR UPDATE TO anon
  USING (
    contrato_id IS NOT NULL
    AND contrato_id = portal_token_contrato_id()
  )
  WITH CHECK (
    contrato_id IS NOT NULL
    AND contrato_id = portal_token_contrato_id()
  );

-- Permitir leitura de transacoes (parcelas) do contrato via portal
CREATE POLICY "Anon pode ler transacoes com token válido"
  ON public.transacoes FOR SELECT TO anon
  USING (
    contrato_id IS NOT NULL
    AND contrato_id = portal_token_contrato_id()
  );

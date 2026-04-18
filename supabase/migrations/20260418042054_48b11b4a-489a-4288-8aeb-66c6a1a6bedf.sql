DROP POLICY IF EXISTS "Admins/gerentes podem ver integrações da loja" ON public.integracoes;
DROP POLICY IF EXISTS "Admins/gerentes podem criar integrações da loja" ON public.integracoes;
DROP POLICY IF EXISTS "Admins/gerentes podem atualizar integrações da loja" ON public.integracoes;
DROP POLICY IF EXISTS "Admins/gerentes podem remover integrações da loja" ON public.integracoes;

CREATE POLICY "Admins/gerentes podem ver integrações da loja"
ON public.integracoes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role, loja_id)
      OR has_role(auth.uid(), 'gerente'::app_role, loja_id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Admins/gerentes podem criar integrações da loja"
ON public.integracoes
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role, loja_id)
      OR has_role(auth.uid(), 'gerente'::app_role, loja_id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Admins/gerentes podem atualizar integrações da loja"
ON public.integracoes
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role, loja_id)
      OR has_role(auth.uid(), 'gerente'::app_role, loja_id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role, loja_id)
      OR has_role(auth.uid(), 'gerente'::app_role, loja_id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Admins/gerentes podem remover integrações da loja"
ON public.integracoes
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role, loja_id)
      OR has_role(auth.uid(), 'gerente'::app_role, loja_id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Anon pode ler token válido" ON public.portal_tokens;

CREATE OR REPLACE FUNCTION public.has_valid_portal_token(_contrato_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_tokens
    WHERE contrato_id = _contrato_id
      AND expires_at > now()
      AND token = COALESCE(
        (current_setting('request.headers', true)::json ->> 'x-portal-token'),
        ''
      )
  )
$function$;
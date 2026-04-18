-- 1) PRIVILEGE ESCALATION em user_roles: garantir que só admin gerencia papéis
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles select self or admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles insert admin only" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles update admin only" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles delete admin only" ON public.user_roles;

CREATE POLICY "user_roles select self or admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'franqueador'::app_role)
);

CREATE POLICY "user_roles insert admin only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'franqueador'::app_role)
);

CREATE POLICY "user_roles update admin only"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'franqueador'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'franqueador'::app_role)
);

CREATE POLICY "user_roles delete admin only"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'franqueador'::app_role)
);

-- 2) MONTADOR overscope em contratos: restringir UPDATE
DROP POLICY IF EXISTS "Atualiza contratos da loja" ON public.contratos;

CREATE POLICY "Atualiza contratos da loja"
ON public.contratos
FOR UPDATE
TO authenticated
USING (
  (loja_id = public.current_loja_id())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'tecnico'::app_role)
    OR (vendedor_id = auth.uid())
    OR (
      public.has_role(auth.uid(), 'montador'::app_role)
      AND status = 'montagem'::contrato_status
    )
  )
);

-- 3) PORTAL_TOKENS: garantir RLS habilitado e bloqueio explícito de mutações pelo cliente
ALTER TABLE public.portal_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_tokens block insert" ON public.portal_tokens;
DROP POLICY IF EXISTS "portal_tokens block update" ON public.portal_tokens;
DROP POLICY IF EXISTS "portal_tokens block delete" ON public.portal_tokens;

CREATE POLICY "portal_tokens block insert"
ON public.portal_tokens
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "portal_tokens block update"
ON public.portal_tokens
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "portal_tokens block delete"
ON public.portal_tokens
FOR DELETE
TO authenticated, anon
USING (false);
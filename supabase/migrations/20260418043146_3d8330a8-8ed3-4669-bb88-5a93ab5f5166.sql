-- 1) Bloquear admin de atribuir 'franqueador' via INSERT
DROP POLICY IF EXISTS "user_roles insert admin only" ON public.user_roles;

CREATE POLICY "user_roles insert admin only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'franqueador'::app_role
  )
);

-- 2) Escopar lojas por loja do admin
DROP POLICY IF EXISTS "Admin gerencia lojas" ON public.lojas;
DROP POLICY IF EXISTS "Franqueador vê todas as lojas" ON public.lojas;

CREATE POLICY "Lojas select escopo"
ON public.lojas
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'franqueador'::app_role)
  OR id = public.current_loja_id()
);

CREATE POLICY "Lojas insert franqueador"
ON public.lojas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'franqueador'::app_role)
);

CREATE POLICY "Lojas update admin propria ou franqueador"
ON public.lojas
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'franqueador'::app_role)
  OR (id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  public.has_role(auth.uid(), 'franqueador'::app_role)
  OR (id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Lojas delete franqueador"
ON public.lojas
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'franqueador'::app_role)
);
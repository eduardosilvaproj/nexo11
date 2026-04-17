-- Fix 1: prevent admin from updating franqueador rows or escalating to franqueador
DROP POLICY IF EXISTS "Admin/franqueador atualiza papéis" ON public.user_roles;

CREATE POLICY "Admin/franqueador atualiza papéis"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      public.has_role(auth.uid(), 'admin'::app_role)
      AND loja_id = public.current_loja_id()
      AND role <> 'franqueador'::app_role
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      public.has_role(auth.uid(), 'admin'::app_role)
      AND loja_id = public.current_loja_id()
      AND role <> 'franqueador'::app_role
    )
  );

-- Also tighten DELETE so admin cannot remove a franqueador row
DROP POLICY IF EXISTS "Admin/franqueador remove papéis" ON public.user_roles;

CREATE POLICY "Admin/franqueador remove papéis"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      public.has_role(auth.uid(), 'admin'::app_role)
      AND loja_id = public.current_loja_id()
      AND role <> 'franqueador'::app_role
    )
  );

-- Fix 2: block client-side INSERT into notificacoes (triggers use SECURITY DEFINER and bypass RLS)
CREATE POLICY "Notificacoes: bloquear insert do cliente"
  ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (false);
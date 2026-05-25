DROP POLICY IF EXISTS "platform_admin_manage_roles" ON public.platform_user_roles;

DROP POLICY IF EXISTS "platform_user_roles_select_own" ON public.platform_user_roles;

CREATE POLICY "platform_user_roles_select_own"
ON public.platform_user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_platform_role(auth.uid(), 'platform_admin'::public.platform_role)
);
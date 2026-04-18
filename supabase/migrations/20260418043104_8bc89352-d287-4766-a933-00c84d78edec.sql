-- Remove policies antigas/duplicadas em user_roles que causavam OR-bypass
DROP POLICY IF EXISTS "Admin/franqueador insere papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Admin/franqueador atualizam papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Admin/franqueador removem papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários veem próprios papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Admin/franqueador veem papéis" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

-- Restringir SELECT em fornecedores (excluir montador/vendedor)
DROP POLICY IF EXISTS "Fornecedores visíveis pela loja" ON public.fornecedores;

CREATE POLICY "Fornecedores visíveis por papéis privilegiados"
ON public.fornecedores
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    loja_id = public.current_loja_id()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
      OR public.has_role(auth.uid(), 'tecnico'::app_role)
    )
  )
);
-- Drop the overly permissive ALL policy that allowed gerente to create/delete users
DROP POLICY IF EXISTS "Admin/gerente gerenciam usuários da loja" ON public.usuarios;

-- Gerente keeps SELECT access (already covered by "Usuario vê próprios dados completos")
-- Recreate granular write policies: only admin/franqueador

CREATE POLICY "Admin/franqueador inserem usuários da loja"
ON public.usuarios FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admin/franqueador atualizam usuários da loja"
ON public.usuarios FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admin/franqueador removem usuários da loja"
ON public.usuarios FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND has_role(auth.uid(), 'admin'::app_role))
);
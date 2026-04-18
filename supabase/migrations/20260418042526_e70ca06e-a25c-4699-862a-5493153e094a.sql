DROP POLICY IF EXISTS "Admins/gerentes podem ver integrações da loja" ON public.integracoes;
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
DROP POLICY IF EXISTS "Manage settings by store managers" ON public.communication_settings;

CREATE POLICY "Manage settings by store managers" 
ON public.communication_settings 
FOR ALL 
TO authenticated
USING (
  (loja_id IN (SELECT u.loja_id FROM usuarios u WHERE u.id = auth.uid()) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role)))
  OR has_role(auth.uid(), 'franqueador'::app_role)
)
WITH CHECK (
  (loja_id IN (SELECT u.loja_id FROM usuarios u WHERE u.id = auth.uid()) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role)))
  OR has_role(auth.uid(), 'franqueador'::app_role)
);

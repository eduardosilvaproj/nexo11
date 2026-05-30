-- Fix: permitir franqueador e financeiro atualizar leads
DROP POLICY IF EXISTS "Vendedor atualiza próprios leads" ON public.leads;

CREATE POLICY "Atualiza leads na loja" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      loja_id = public.current_loja_id() AND (
        vendedor_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gerente'::app_role)
        OR has_role(auth.uid(), 'financeiro'::app_role)
      )
    )
  );

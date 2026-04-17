DROP POLICY IF EXISTS "DRE segue contrato (select)" ON public.dre_contrato;

CREATE POLICY "DRE segue contrato (select)"
  ON public.dre_contrato
  FOR SELECT
  TO authenticated
  USING (
    public.contrato_da_loja(contrato_id)
    OR public.has_role(auth.uid(), 'franqueador'::public.app_role)
  );
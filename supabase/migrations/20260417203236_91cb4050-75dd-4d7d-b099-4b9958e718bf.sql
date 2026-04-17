
-- regras_comissao: only admin/franqueador can write
DROP POLICY IF EXISTS "Regras insert admin/gerente" ON public.regras_comissao;
DROP POLICY IF EXISTS "Regras update admin/gerente" ON public.regras_comissao;
DROP POLICY IF EXISTS "Regras delete admin" ON public.regras_comissao;

CREATE POLICY "Regras insert admin/franqueador"
  ON public.regras_comissao FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Regras update admin/franqueador"
  ON public.regras_comissao FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Regras delete admin/franqueador"
  ON public.regras_comissao FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  );

-- comissoes: only admin/franqueador can write/mark paid
DROP POLICY IF EXISTS "Comissoes insert admin/gerente" ON public.comissoes;
DROP POLICY IF EXISTS "Comissoes update admin/gerente" ON public.comissoes;
DROP POLICY IF EXISTS "Comissoes delete admin" ON public.comissoes;

CREATE POLICY "Comissoes insert admin/franqueador"
  ON public.comissoes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Comissoes update admin/franqueador"
  ON public.comissoes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Comissoes delete admin/franqueador"
  ON public.comissoes FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  );

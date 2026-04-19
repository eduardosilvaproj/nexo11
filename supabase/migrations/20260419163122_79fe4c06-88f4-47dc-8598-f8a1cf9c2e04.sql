
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

-- Clientes
CREATE POLICY "Clientes visíveis por loja/papel"
  ON public.clientes FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    ))
  );

CREATE POLICY "Clientes insert por papeis"
  ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    )
  );

CREATE POLICY "Clientes update por papeis"
  ON public.clientes FOR UPDATE TO authenticated
  USING (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    )
  )
  WITH CHECK (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    )
  );

CREATE POLICY "Clientes delete por admin/gerente"
  ON public.clientes FOR DELETE TO authenticated
  USING (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

-- Orcamentos
CREATE POLICY "Orcamentos visíveis por loja/papel"
  ON public.orcamentos FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    ))
  );

CREATE POLICY "Orcamentos insert por papeis"
  ON public.orcamentos FOR INSERT TO authenticated
  WITH CHECK (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    )
  );

CREATE POLICY "Orcamentos update por papeis"
  ON public.orcamentos FOR UPDATE TO authenticated
  USING (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    )
  )
  WITH CHECK (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    )
  );

CREATE POLICY "Orcamentos delete por admin/gerente"
  ON public.orcamentos FOR DELETE TO authenticated
  USING (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

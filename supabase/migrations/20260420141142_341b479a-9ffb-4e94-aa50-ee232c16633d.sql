
ALTER TABLE public.conferencia_ambientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conferencia select" ON public.conferencia_ambientes;
CREATE POLICY "Conferencia select"
  ON public.conferencia_ambientes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      public.contrato_da_loja(contrato_id)
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'gerente'::app_role)
        OR public.has_role(auth.uid(), 'tecnico'::app_role)
        OR public.has_role(auth.uid(), 'conferente'::app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Conferencia insert" ON public.conferencia_ambientes;
CREATE POLICY "Conferencia insert"
  ON public.conferencia_ambientes FOR INSERT TO authenticated
  WITH CHECK (
    public.contrato_da_loja(contrato_id)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
      OR public.has_role(auth.uid(), 'tecnico'::app_role)
      OR public.has_role(auth.uid(), 'conferente'::app_role)
    )
  );

DROP POLICY IF EXISTS "Conferencia update" ON public.conferencia_ambientes;
CREATE POLICY "Conferencia update"
  ON public.conferencia_ambientes FOR UPDATE TO authenticated
  USING (
    public.contrato_da_loja(contrato_id)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
      OR public.has_role(auth.uid(), 'tecnico'::app_role)
      OR public.has_role(auth.uid(), 'conferente'::app_role)
    )
  )
  WITH CHECK (
    public.contrato_da_loja(contrato_id)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
      OR public.has_role(auth.uid(), 'tecnico'::app_role)
      OR public.has_role(auth.uid(), 'conferente'::app_role)
    )
  );

DROP POLICY IF EXISTS "Conferencia delete" ON public.conferencia_ambientes;
CREATE POLICY "Conferencia delete"
  ON public.conferencia_ambientes FOR DELETE TO authenticated
  USING (
    public.contrato_da_loja(contrato_id)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
    )
  );

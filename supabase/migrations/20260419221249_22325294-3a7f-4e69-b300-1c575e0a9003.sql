CREATE TABLE public.montadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  email text,
  percentual_padrao numeric(5,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_montadores_loja ON public.montadores(loja_id);

ALTER TABLE public.montadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Montadores visíveis por admin/gerente da loja"
  ON public.montadores FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    ))
  );

CREATE POLICY "Montadores insert por admin/gerente"
  ON public.montadores FOR INSERT TO authenticated
  WITH CHECK (
    loja_id = current_loja_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  );

CREATE POLICY "Montadores update por admin/gerente"
  ON public.montadores FOR UPDATE TO authenticated
  USING (
    loja_id = current_loja_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  )
  WITH CHECK (
    loja_id = current_loja_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  );

CREATE POLICY "Montadores delete por admin"
  ON public.montadores FOR DELETE TO authenticated
  USING (
    loja_id = current_loja_id()
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER set_montadores_updated_at
  BEFORE UPDATE ON public.montadores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
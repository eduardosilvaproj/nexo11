CREATE TABLE IF NOT EXISTS public.metas_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  meta_faturamento numeric(14,2) NOT NULL DEFAULT 0,
  meta_margem numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loja_id, mes_referencia)
);

ALTER TABLE public.metas_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Metas visíveis por gerente/admin/franqueador"
  ON public.metas_loja FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR ((loja_id = current_loja_id())
        AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gerente'::app_role)))
  );

CREATE POLICY "Metas insert admin/franqueador"
  ON public.metas_loja FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR ((loja_id = current_loja_id()) AND has_role(auth.uid(),'admin'::app_role))
  );

CREATE POLICY "Metas update admin/franqueador"
  ON public.metas_loja FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR ((loja_id = current_loja_id()) AND has_role(auth.uid(),'admin'::app_role))
  )
  WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR ((loja_id = current_loja_id()) AND has_role(auth.uid(),'admin'::app_role))
  );

CREATE POLICY "Metas delete admin/franqueador"
  ON public.metas_loja FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR ((loja_id = current_loja_id()) AND has_role(auth.uid(),'admin'::app_role))
  );

CREATE TRIGGER set_metas_loja_updated_at
  BEFORE UPDATE ON public.metas_loja
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
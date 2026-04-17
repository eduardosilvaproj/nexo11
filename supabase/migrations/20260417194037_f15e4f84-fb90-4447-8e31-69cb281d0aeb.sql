-- Restringir edição de custos_fixos a admin/franqueador (remover gerente)
DROP POLICY IF EXISTS "Custos fixos insert por admin/gerente" ON public.custos_fixos;
DROP POLICY IF EXISTS "Custos fixos update por admin/gerente" ON public.custos_fixos;
DROP POLICY IF EXISTS "Custos fixos delete por admin/gerente" ON public.custos_fixos;

CREATE POLICY "Custos fixos insert por admin/franqueador"
ON public.custos_fixos FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR ((loja_id = current_loja_id()) AND has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Custos fixos update por admin/franqueador"
ON public.custos_fixos FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR ((loja_id = current_loja_id()) AND has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR ((loja_id = current_loja_id()) AND has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Custos fixos delete por admin/franqueador"
ON public.custos_fixos FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR ((loja_id = current_loja_id()) AND has_role(auth.uid(), 'admin'::app_role))
);

-- Permitir SELECT também para gerente (visualização permitida para gerente/admin/franqueador)
DROP POLICY IF EXISTS "Custos fixos visíveis pela loja" ON public.custos_fixos;
CREATE POLICY "Custos fixos visíveis por gerente/admin/franqueador"
ON public.custos_fixos FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR ((loja_id = current_loja_id()) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
  ))
);
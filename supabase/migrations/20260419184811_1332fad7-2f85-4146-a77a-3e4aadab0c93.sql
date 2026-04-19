-- Enable RLS and add policies for condicoes_pagamento
ALTER TABLE public.condicoes_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Condicoes visiveis por loja/papel"
ON public.condicoes_pagamento
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'vendedor'::app_role)
  ))
);

CREATE POLICY "Condicoes insert por admin/gerente"
ON public.condicoes_pagamento
FOR INSERT
TO authenticated
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Condicoes update por admin/gerente"
ON public.condicoes_pagamento
FOR UPDATE
TO authenticated
USING (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
)
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Condicoes delete por admin"
ON public.condicoes_pagamento
FOR DELETE
TO authenticated
USING (
  loja_id = current_loja_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);
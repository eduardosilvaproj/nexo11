
-- ============== ORDENS DE PRODUCAO ==============
DROP POLICY IF EXISTS "OPs gerenciadas pela loja" ON public.ordens_producao;

CREATE POLICY "OPs insert por tecnico/gerente/admin"
ON public.ordens_producao FOR INSERT TO authenticated
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role))
);

CREATE POLICY "OPs update por tecnico/gerente/admin"
ON public.ordens_producao FOR UPDATE TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role))
)
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role))
);

CREATE POLICY "OPs delete por gerente/admin"
ON public.ordens_producao FOR DELETE TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role))
);

-- ============== ENTREGAS ==============
DROP POLICY IF EXISTS "Entregas gerenciadas pela loja" ON public.entregas;

CREATE POLICY "Entregas insert por tecnico/gerente/admin"
ON public.entregas FOR INSERT TO authenticated
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role))
);

CREATE POLICY "Entregas update por tecnico/gerente/admin"
ON public.entregas FOR UPDATE TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role))
)
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role))
);

CREATE POLICY "Entregas delete por gerente/admin"
ON public.entregas FOR DELETE TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role))
);

-- ============== AGENDAMENTOS DE MONTAGEM ==============
DROP POLICY IF EXISTS "Agendamentos gerenciados pela loja" ON public.agendamentos_montagem;

CREATE POLICY "Agendamentos insert por gerente/admin"
ON public.agendamentos_montagem FOR INSERT TO authenticated
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Agendamentos update por montador/gerente/admin"
ON public.agendamentos_montagem FOR UPDATE TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'montador'::app_role))
)
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'montador'::app_role))
);

CREATE POLICY "Agendamentos delete por gerente/admin"
ON public.agendamentos_montagem FOR DELETE TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role))
);

-- ============== RETRABALHOS ==============
DROP POLICY IF EXISTS "Retrabalhos gerenciados pela loja" ON public.retrabalhos;

CREATE POLICY "Retrabalhos insert por montador/tecnico/gerente/admin"
ON public.retrabalhos FOR INSERT TO authenticated
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
    OR has_role(auth.uid(), 'montador'::app_role))
);

CREATE POLICY "Retrabalhos update por montador/tecnico/gerente/admin"
ON public.retrabalhos FOR UPDATE TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
    OR has_role(auth.uid(), 'montador'::app_role))
)
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
    OR has_role(auth.uid(), 'montador'::app_role))
);

CREATE POLICY "Retrabalhos delete por admin"
ON public.retrabalhos FOR DELETE TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND has_role(auth.uid(), 'admin'::app_role)
);

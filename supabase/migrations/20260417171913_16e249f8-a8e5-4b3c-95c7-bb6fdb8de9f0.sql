-- Drop the broad ALL policy and replace with granular role-based policies
DROP POLICY IF EXISTS "Chamados gerenciados pela loja" ON public.chamados_pos_venda;

-- INSERT: abrir chamado — todos os papéis exceto montador
CREATE POLICY "Chamados insert exceto montador"
ON public.chamados_pos_venda
FOR INSERT
TO authenticated
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND NOT has_role(auth.uid(), 'montador'::app_role)
);

-- UPDATE: resolver chamado / registrar NPS — admin, gerente, tecnico, vendedor
CREATE POLICY "Chamados update por admin/gerente/tecnico/vendedor"
ON public.chamados_pos_venda
FOR UPDATE
TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
    OR has_role(auth.uid(), 'vendedor'::app_role)
  )
)
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
    OR has_role(auth.uid(), 'vendedor'::app_role)
  )
);

-- DELETE: apenas admin/gerente
CREATE POLICY "Chamados delete por admin/gerente"
ON public.chamados_pos_venda
FOR DELETE
TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
  )
);
DROP POLICY IF EXISTS "Anon pode ler contratos com token válido" ON public.contratos;
CREATE POLICY "Anon pode ler contratos com token válido"
ON public.contratos
FOR SELECT
TO anon
USING (id = public.portal_token_contrato_id());

DROP POLICY IF EXISTS "Anon pode ler entregas com token válido" ON public.entregas;
CREATE POLICY "Anon pode ler entregas com token válido"
ON public.entregas
FOR SELECT
TO anon
USING (contrato_id = public.portal_token_contrato_id());

DROP POLICY IF EXISTS "Anon pode ler chamados com token válido" ON public.chamados_pos_venda;
CREATE POLICY "Anon pode ler chamados com token válido"
ON public.chamados_pos_venda
FOR SELECT
TO anon
USING (contrato_id = public.portal_token_contrato_id());

DROP POLICY IF EXISTS "Anon pode ler logs com token válido" ON public.contrato_logs;
CREATE POLICY "Anon pode ler logs com token válido"
ON public.contrato_logs
FOR SELECT
TO anon
USING (contrato_id = public.portal_token_contrato_id());

DROP POLICY IF EXISTS "Anon pode ler agendamentos com token válido" ON public.agendamentos_montagem;
CREATE POLICY "Anon pode ler agendamentos com token válido"
ON public.agendamentos_montagem
FOR SELECT
TO anon
USING (contrato_id = public.portal_token_contrato_id());
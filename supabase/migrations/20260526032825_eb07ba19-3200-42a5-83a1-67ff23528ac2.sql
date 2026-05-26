DROP POLICY IF EXISTS "portal cliente pode assinar contrato" ON public.contratos;
DROP POLICY IF EXISTS "portal cliente pode visualizar contratos" ON public.contratos;
DROP POLICY IF EXISTS "Anon pode ler contratos com token válido" ON public.contratos;
DROP POLICY IF EXISTS "Portal pode assinar contrato com token válido" ON public.contratos;

CREATE POLICY "Anon pode ler contratos com token válido"
ON public.contratos FOR SELECT TO anon
USING (id = public.portal_token_contrato_id());

CREATE POLICY "Portal pode assinar contrato com token válido"
ON public.contratos FOR UPDATE TO anon
USING (id = public.portal_token_contrato_id())
WITH CHECK (id = public.portal_token_contrato_id());

DROP POLICY IF EXISTS "portal pode inserir log" ON public.contrato_logs;
DROP POLICY IF EXISTS "portal cliente pode visualizar logs" ON public.contrato_logs;
DROP POLICY IF EXISTS "Anon pode ler logs com token válido" ON public.contrato_logs;
DROP POLICY IF EXISTS "Portal pode inserir log com token válido" ON public.contrato_logs;

CREATE POLICY "Anon pode ler logs com token válido"
ON public.contrato_logs FOR SELECT TO anon
USING (contrato_id = public.portal_token_contrato_id());

CREATE POLICY "Portal pode inserir log com token válido"
ON public.contrato_logs FOR INSERT TO anon
WITH CHECK (contrato_id = public.portal_token_contrato_id());

DROP POLICY IF EXISTS "portal cliente pode visualizar orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Anon pode ler orcamentos com token válido" ON public.orcamentos;

CREATE POLICY "Anon pode ler orcamentos com token válido"
ON public.orcamentos FOR SELECT TO anon
USING (contrato_id = public.portal_token_contrato_id());

DROP POLICY IF EXISTS "portal cliente pode visualizar ambientes" ON public.contrato_ambientes;
DROP POLICY IF EXISTS "Anon pode ler ambientes com token válido" ON public.contrato_ambientes;

CREATE POLICY "Anon pode ler ambientes com token válido"
ON public.contrato_ambientes FOR SELECT TO anon
USING (contrato_id = public.portal_token_contrato_id());

DROP POLICY IF EXISTS "permitir upload assinatura portal" ON storage.objects;
DROP POLICY IF EXISTS "permitir ver assinatura portal" ON storage.objects;
DROP POLICY IF EXISTS "Upload assinatura com token válido" ON storage.objects;
DROP POLICY IF EXISTS "Ver assinatura com token válido" ON storage.objects;

CREATE POLICY "Upload assinatura com token válido"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'assinaturas'
  AND public.portal_token_contrato_id() IS NOT NULL
);

CREATE POLICY "Ver assinatura com token válido"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'assinaturas'
  AND public.portal_token_contrato_id() IS NOT NULL
);

UPDATE storage.buckets SET public = false WHERE id = 'assinaturas';
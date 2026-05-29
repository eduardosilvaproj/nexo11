-- =========================================================
-- SECURITY FIX: Remover policies abertas e restringir acesso anon
-- 
-- Problema: migration 20260424200414 criou policies com USING(true)
-- para anon em contratos, contrato_logs, orcamentos e contrato_ambientes.
-- Isso permite que qualquer pessoa sem autenticação leia/edite todos os dados.
--
-- Correção: dropar policies abertas e manter apenas as baseadas em
-- portal_token_contrato_id() que validam o token + expiração.
-- =========================================================

-- 1. CONTRATOS — remover policies abertas
DROP POLICY IF EXISTS "portal cliente pode assinar contrato" ON public.contratos;
DROP POLICY IF EXISTS "portal cliente pode visualizar contratos" ON public.contratos;

-- Recriar policy de SELECT segura (baseada em token válido)
-- A policy "Anon pode ler contratos com token válido" já existe da migration anterior,
-- mas vamos garantir que está presente:
DROP POLICY IF EXISTS "Anon pode ler contratos com token válido" ON public.contratos;
CREATE POLICY "Anon pode ler contratos com token válido"
ON public.contratos FOR SELECT TO anon
USING (id = public.portal_token_contrato_id());

-- Policy de UPDATE para assinatura — restrita ao contrato do token
CREATE POLICY "Portal pode assinar contrato com token válido"
ON public.contratos FOR UPDATE TO anon
USING (id = public.portal_token_contrato_id())
WITH CHECK (id = public.portal_token_contrato_id());

-- 2. CONTRATO_LOGS — remover policies abertas
DROP POLICY IF EXISTS "portal pode inserir log" ON public.contrato_logs;
DROP POLICY IF EXISTS "portal cliente pode visualizar logs" ON public.contrato_logs;

-- Recriar seguras
DROP POLICY IF EXISTS "Anon pode ler logs com token válido" ON public.contrato_logs;
CREATE POLICY "Anon pode ler logs com token válido"
ON public.contrato_logs FOR SELECT TO anon
USING (contrato_id = public.portal_token_contrato_id());

CREATE POLICY "Portal pode inserir log com token válido"
ON public.contrato_logs FOR INSERT TO anon
WITH CHECK (contrato_id = public.portal_token_contrato_id());

-- 3. ORCAMENTOS — remover policy aberta
DROP POLICY IF EXISTS "portal cliente pode visualizar orcamentos" ON public.orcamentos;

-- Recriar segura (orçamento vinculado ao contrato via contrato_id)
CREATE POLICY "Anon pode ler orcamentos com token válido"
ON public.orcamentos FOR SELECT TO anon
USING (contrato_id = public.portal_token_contrato_id());

-- 4. CONTRATO_AMBIENTES — remover policy aberta
DROP POLICY IF EXISTS "portal cliente pode visualizar ambientes" ON public.contrato_ambientes;

-- Recriar segura
CREATE POLICY "Anon pode ler ambientes com token válido"
ON public.contrato_ambientes FOR SELECT TO anon
USING (contrato_id = public.portal_token_contrato_id());

-- 5. STORAGE — restringir bucket assinaturas
-- Remover policies abertas de upload/leitura
DROP POLICY IF EXISTS "permitir upload assinatura portal" ON storage.objects;
DROP POLICY IF EXISTS "permitir ver assinatura portal" ON storage.objects;

-- Recriar com validação: só permite upload/leitura se houver token válido
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

-- Tornar bucket privado (não expor arquivos sem autenticação via URL direta)
UPDATE storage.buckets SET public = false WHERE id = 'assinaturas';

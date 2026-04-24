-- Garantir que o bucket assinaturas existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas', 'assinaturas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remover políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "permitir upload anonimo de assinaturas" ON storage.objects;
DROP POLICY IF EXISTS "permitir visualizacao publica de assinaturas" ON storage.objects;

-- Criar política de insert aberta para usuários anon no bucket assinaturas
CREATE POLICY "permitir upload anonimo de assinaturas"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'assinaturas');

-- Criar política de select pública para o bucket assinaturas
CREATE POLICY "permitir visualizacao publica de assinaturas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assinaturas');

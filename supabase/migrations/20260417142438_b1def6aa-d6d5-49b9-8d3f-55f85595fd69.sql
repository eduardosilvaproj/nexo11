UPDATE storage.buckets SET public = false WHERE id = 'entregas-fotos';

DROP POLICY IF EXISTS "Entregas fotos - leitura pública" ON storage.objects;

CREATE POLICY "Entregas fotos - select por loja"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'entregas-fotos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);
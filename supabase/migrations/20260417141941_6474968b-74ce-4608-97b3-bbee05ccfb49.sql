-- Bucket privado para arquivos por contrato
INSERT INTO storage.buckets (id, name, public)
VALUES ('contrato-arquivos', 'contrato-arquivos', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: extrai contrato_id do primeiro segmento do path
-- Path esperado: <contrato_id>/<filename>

CREATE POLICY "Arquivos contrato - select por loja"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contrato-arquivos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Arquivos contrato - insert por loja"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contrato-arquivos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Arquivos contrato - update por loja"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contrato-arquivos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Arquivos contrato - delete por loja"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contrato-arquivos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);
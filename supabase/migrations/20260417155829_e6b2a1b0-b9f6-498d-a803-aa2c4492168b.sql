CREATE POLICY "Entregas fotos: select por loja"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'entregas-fotos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Entregas fotos: insert por loja"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'entregas-fotos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Entregas fotos: update por loja"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'entregas-fotos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Entregas fotos: delete por loja"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'entregas-fotos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);

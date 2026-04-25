-- Adicionar colunas para medição técnica detalhada
ALTER TABLE public.contrato_ambientes 
ADD COLUMN IF NOT EXISTS medicao_fotos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS medicao_scan_url TEXT,
ADD COLUMN IF NOT EXISTS medicao_concluido BOOLEAN DEFAULT false;

-- Criar bucket para arquivos de medição
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medicao-arquivos', 'medicao-arquivos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para medicao-arquivos
CREATE POLICY "Medicao arquivos access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'medicao-arquivos');

CREATE POLICY "Medicao arquivos insert" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'medicao-arquivos');

CREATE POLICY "Medicao arquivos update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'medicao-arquivos');

CREATE POLICY "Medicao arquivos delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'medicao-arquivos');
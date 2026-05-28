
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS checklist_comercial jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS endereco_entrega jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS eletrodomesticos_status text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS planta_hidraulica_status text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS itens_extras_status text DEFAULT 'pendente';

INSERT INTO storage.buckets (id, name, public)
VALUES ('contrato-comercial', 'contrato-comercial', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read contrato-comercial"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contrato-comercial');

CREATE POLICY "Authenticated insert contrato-comercial"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contrato-comercial');

CREATE POLICY "Authenticated update contrato-comercial"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'contrato-comercial');

CREATE POLICY "Authenticated delete contrato-comercial"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contrato-comercial');

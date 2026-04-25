ALTER TABLE public.contrato_ambientes ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'xml';
COMMENT ON COLUMN public.contrato_ambientes.origem IS 'Origem do ambiente: xml ou manual';
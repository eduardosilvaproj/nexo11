ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'terceirizado',
  ADD COLUMN IF NOT EXISTS prazo_padrao_dias integer NOT NULL DEFAULT 30;

ALTER TABLE public.fornecedores
  DROP CONSTRAINT IF EXISTS fornecedores_tipo_check;

ALTER TABLE public.fornecedores
  ADD CONSTRAINT fornecedores_tipo_check CHECK (tipo IN ('fabrica_xml','terceirizado'));
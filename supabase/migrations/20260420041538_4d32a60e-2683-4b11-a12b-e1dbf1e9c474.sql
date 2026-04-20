ALTER TABLE public.producao_terceirizada
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS situacao text;
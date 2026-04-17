ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS valor_estimado numeric,
  ADD COLUMN IF NOT EXISTS observacoes text;
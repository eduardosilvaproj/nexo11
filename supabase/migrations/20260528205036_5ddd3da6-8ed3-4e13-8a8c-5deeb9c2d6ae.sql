ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS valor_conferido numeric,
  ADD COLUMN IF NOT EXISTS conferencia_aprovada_gerente boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pedido_fabrica_status text DEFAULT 'aguardando',
  ADD COLUMN IF NOT EXISTS comprovante_fabrica_url text,
  ADD COLUMN IF NOT EXISTS medicao_concluida_em timestamptz,
  ADD COLUMN IF NOT EXISTS conferencia_concluida_em timestamptz;
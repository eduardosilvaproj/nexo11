ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS assinado_em timestamptz,
  ADD COLUMN IF NOT EXISTS assinado_nome text,
  ADD COLUMN IF NOT EXISTS assinado_ip text,
  ADD COLUMN IF NOT EXISTS assinado_user_agent text,
  ADD COLUMN IF NOT EXISTS assinatura_hash text,
  ADD COLUMN IF NOT EXISTS assinatura_imagem_url text,
  ADD COLUMN IF NOT EXISTS pdf_assinado_url text;
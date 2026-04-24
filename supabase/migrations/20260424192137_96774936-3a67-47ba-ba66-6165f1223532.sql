-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS contrato_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid REFERENCES contratos(id),
  etapa text,
  descricao text,
  usuario_nome text,
  created_at timestamptz DEFAULT now()
);

-- Ensure columns exist if table was already created but was incomplete
ALTER TABLE contrato_logs
  ADD COLUMN IF NOT EXISTS etapa text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS usuario_nome text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
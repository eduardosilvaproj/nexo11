-- Add provider_message_id to cliente_comunicacoes
ALTER TABLE public.cliente_comunicacoes 
ADD COLUMN IF NOT EXISTS provider_message_id TEXT;

-- Create an index for faster lookups by provider ID (useful for webhooks)
CREATE INDEX IF NOT EXISTS idx_cliente_comunicacoes_provider_id 
ON public.cliente_comunicacoes (provider_message_id);
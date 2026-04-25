ALTER TABLE public.contrato_ambientes 
ADD COLUMN IF NOT EXISTS status_medicao TEXT DEFAULT 'pendente';

-- Update existing records to have a default value if they are null
UPDATE public.contrato_ambientes SET status_medicao = 'pendente' WHERE status_medicao IS NULL;
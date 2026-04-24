ALTER TABLE public.lojas 
ADD COLUMN IF NOT EXISTS desconto_maximo_sem_aprovacao INTEGER DEFAULT 10;
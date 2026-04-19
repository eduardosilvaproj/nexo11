
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entrega_turno') THEN
    CREATE TYPE public.entrega_turno AS ENUM ('manha','tarde','dia_todo');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entrega_status_visual') THEN
    CREATE TYPE public.entrega_status_visual AS ENUM ('a_agendar','agendado','em_rota','entregue','reagendado');
  END IF;
END$$;

ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS turno public.entrega_turno NOT NULL DEFAULT 'manha',
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS status_visual public.entrega_status_visual NOT NULL DEFAULT 'agendado',
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS endereco text;

-- Mantém status_visual em sincronia mínima com status existente
UPDATE public.entregas SET status_visual = 'entregue' WHERE status = 'confirmada' AND status_visual <> 'entregue';

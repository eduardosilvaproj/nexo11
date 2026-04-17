ALTER TABLE public.agendamentos_montagem
  ADD CONSTRAINT agendamentos_montagem_equipe_id_fkey
  FOREIGN KEY (equipe_id) REFERENCES public.equipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_montagem_equipe_id ON public.agendamentos_montagem(equipe_id);
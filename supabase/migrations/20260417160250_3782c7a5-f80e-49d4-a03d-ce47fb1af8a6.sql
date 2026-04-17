
-- Tabela equipes
CREATE TABLE IF NOT EXISTS public.equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#1E6FBF',
  capacidade_horas_dia numeric(5,2) NOT NULL DEFAULT 8,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipes visíveis pela loja"
ON public.equipes FOR SELECT TO authenticated
USING (loja_id = public.current_loja_id()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'franqueador'::app_role));

CREATE POLICY "Equipes: insert por gerente/admin"
ON public.equipes FOR INSERT TO authenticated
WITH CHECK (loja_id = public.current_loja_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gerente'::app_role)));

CREATE POLICY "Equipes: update por gerente/admin"
ON public.equipes FOR UPDATE TO authenticated
USING (loja_id = public.current_loja_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gerente'::app_role)))
WITH CHECK (loja_id = public.current_loja_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gerente'::app_role)));

CREATE POLICY "Equipes: delete por admin"
ON public.equipes FOR DELETE TO authenticated
USING (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_equipes_updated_at
BEFORE UPDATE ON public.equipes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela equipe_membros
CREATE TABLE IF NOT EXISTS public.equipe_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (equipe_id, user_id)
);

ALTER TABLE public.equipe_membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros visíveis pela loja"
ON public.equipe_membros FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.equipes e
  WHERE e.id = equipe_id
    AND (e.loja_id = public.current_loja_id()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'franqueador'::app_role))));

CREATE POLICY "Membros: gerenciar por gerente/admin"
ON public.equipe_membros FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.equipes e
  WHERE e.id = equipe_id AND e.loja_id = public.current_loja_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gerente'::app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM public.equipes e
  WHERE e.id = equipe_id AND e.loja_id = public.current_loja_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gerente'::app_role))));

-- Índice para o calendário semanal
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_equipe
  ON public.agendamentos_montagem(data, equipe_id);

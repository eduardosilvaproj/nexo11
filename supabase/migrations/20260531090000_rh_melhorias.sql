-- ============================================================
-- RH module improvements: avaliacoes de desempenho, onboarding
-- ============================================================

-- Avaliações de desempenho
CREATE TABLE IF NOT EXISTS public.rh_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  avaliador_id UUID REFERENCES auth.users(id),
  periodo_inicio DATE,
  periodo_fim DATE,
  categorias JSONB NOT NULL DEFAULT '{}',
  metas JSONB DEFAULT '[]',
  feedback TEXT,
  nota_geral NUMERIC(3,1),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviada', 'reconhecida')),
  reconhecida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for rh_avaliacoes
ALTER TABLE public.rh_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_avaliacoes_select" ON public.rh_avaliacoes
  FOR SELECT USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rh_avaliacoes_insert" ON public.rh_avaliacoes
  FOR INSERT WITH CHECK (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rh_avaliacoes_update" ON public.rh_avaliacoes
  FOR UPDATE USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rh_avaliacoes_delete" ON public.rh_avaliacoes
  FOR DELETE USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_rh_avaliacoes_pessoa ON public.rh_avaliacoes(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_rh_avaliacoes_loja ON public.rh_avaliacoes(loja_id);
CREATE INDEX IF NOT EXISTS idx_rh_avaliacoes_status ON public.rh_avaliacoes(status);
CREATE INDEX IF NOT EXISTS idx_rh_avaliacoes_avaliador ON public.rh_avaliacoes(avaliador_id);


-- Onboarding
CREATE TABLE IF NOT EXISTS public.rh_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  concluido BOOLEAN DEFAULT false,
  concluido_em TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pessoa_id)
);

-- RLS for rh_onboarding
ALTER TABLE public.rh_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_onboarding_select" ON public.rh_onboarding
  FOR SELECT USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rh_onboarding_insert" ON public.rh_onboarding
  FOR INSERT WITH CHECK (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rh_onboarding_update" ON public.rh_onboarding
  FOR UPDATE USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rh_onboarding_delete" ON public.rh_onboarding
  FOR DELETE USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_rh_onboarding_pessoa ON public.rh_onboarding(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_rh_onboarding_loja ON public.rh_onboarding(loja_id);
CREATE INDEX IF NOT EXISTS idx_rh_onboarding_concluido ON public.rh_onboarding(concluido);

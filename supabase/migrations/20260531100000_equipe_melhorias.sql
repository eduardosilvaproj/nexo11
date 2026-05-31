-- ============================================================
-- Equipe Melhorias: Metas/OKRs, Mural de Avisos, Gamificacao
-- ============================================================

-- =========================
-- Metas e OKRs
-- =========================
CREATE TABLE IF NOT EXISTS public.equipe_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  pessoa_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'individual' CHECK (tipo IN ('individual', 'equipe')),
  meta_valor NUMERIC(14,2) DEFAULT 0,
  valor_atual NUMERIC(14,2) DEFAULT 0,
  prazo DATE,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluida', 'cancelada')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.equipe_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_metas_select" ON public.equipe_metas
  FOR SELECT USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "equipe_metas_insert" ON public.equipe_metas
  FOR INSERT WITH CHECK (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "equipe_metas_update" ON public.equipe_metas
  FOR UPDATE USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "equipe_metas_delete" ON public.equipe_metas
  FOR DELETE USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_equipe_metas_loja ON public.equipe_metas(loja_id);
CREATE INDEX IF NOT EXISTS idx_equipe_metas_pessoa ON public.equipe_metas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_equipe_metas_status ON public.equipe_metas(status);

-- =========================
-- Mural de Avisos
-- =========================
CREATE TABLE IF NOT EXISTS public.equipe_avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('normal', 'importante', 'urgente')),
  fixado BOOLEAN DEFAULT false,
  lido_por UUID[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.equipe_avisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_avisos_select" ON public.equipe_avisos
  FOR SELECT USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "equipe_avisos_insert" ON public.equipe_avisos
  FOR INSERT WITH CHECK (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "equipe_avisos_update" ON public.equipe_avisos
  FOR UPDATE USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "equipe_avisos_delete" ON public.equipe_avisos
  FOR DELETE USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_equipe_avisos_loja ON public.equipe_avisos(loja_id);
CREATE INDEX IF NOT EXISTS idx_equipe_avisos_fixado ON public.equipe_avisos(fixado);
CREATE INDEX IF NOT EXISTS idx_equipe_avisos_created ON public.equipe_avisos(created_at DESC);

-- =========================
-- Gamificacao
-- =========================
CREATE TABLE IF NOT EXISTS public.equipe_gamificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  pontos INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]',
  mes_referencia DATE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pessoa_id, mes_referencia)
);

ALTER TABLE public.equipe_gamificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_gamificacao_select" ON public.equipe_gamificacao
  FOR SELECT USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "equipe_gamificacao_insert" ON public.equipe_gamificacao
  FOR INSERT WITH CHECK (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "equipe_gamificacao_update" ON public.equipe_gamificacao
  FOR UPDATE USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "equipe_gamificacao_delete" ON public.equipe_gamificacao
  FOR DELETE USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_equipe_gamificacao_loja ON public.equipe_gamificacao(loja_id);
CREATE INDEX IF NOT EXISTS idx_equipe_gamificacao_pessoa ON public.equipe_gamificacao(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_equipe_gamificacao_mes ON public.equipe_gamificacao(mes_referencia);

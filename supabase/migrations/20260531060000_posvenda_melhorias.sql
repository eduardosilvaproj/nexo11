-- ============================================================
-- Pós-venda melhorias: pesquisas de satisfação + base de conhecimento
-- ============================================================

-- Pesquisas de satisfação pós-chamado
CREATE TABLE IF NOT EXISTS public.posvenda_pesquisas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados_pos_venda(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  nota INTEGER CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  recomendaria BOOLEAN,
  respondido_em TIMESTAMPTZ,
  enviado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chamado_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posvenda_pesquisas_chamado ON public.posvenda_pesquisas(chamado_id);
CREATE INDEX IF NOT EXISTS idx_posvenda_pesquisas_contrato ON public.posvenda_pesquisas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_posvenda_pesquisas_loja ON public.posvenda_pesquisas(loja_id);

-- RLS
ALTER TABLE public.posvenda_pesquisas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posvenda_pesquisas_select" ON public.posvenda_pesquisas
  FOR SELECT USING (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "posvenda_pesquisas_insert" ON public.posvenda_pesquisas
  FOR INSERT WITH CHECK (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "posvenda_pesquisas_update" ON public.posvenda_pesquisas
  FOR UPDATE USING (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "posvenda_pesquisas_delete" ON public.posvenda_pesquisas
  FOR DELETE USING (
    public.is_franqueador()
  );

-- ============================================================
-- Base de conhecimento
-- ============================================================

CREATE TABLE IF NOT EXISTS public.posvenda_base_conhecimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('assistencia', 'reclamacao', 'garantia', 'solicitacao', 'geral')),
  descricao TEXT,
  solucao TEXT NOT NULL,
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posvenda_bc_categoria ON public.posvenda_base_conhecimento(categoria);
CREATE INDEX IF NOT EXISTS idx_posvenda_bc_loja ON public.posvenda_base_conhecimento(loja_id);

-- Full text search index on titulo + solucao
CREATE INDEX IF NOT EXISTS idx_posvenda_bc_fts ON public.posvenda_base_conhecimento
  USING gin(to_tsvector('portuguese', coalesce(titulo, '') || ' ' || coalesce(solucao, '')));

-- RLS
ALTER TABLE public.posvenda_base_conhecimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posvenda_bc_select" ON public.posvenda_base_conhecimento
  FOR SELECT USING (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "posvenda_bc_insert" ON public.posvenda_base_conhecimento
  FOR INSERT WITH CHECK (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "posvenda_bc_update" ON public.posvenda_base_conhecimento
  FOR UPDATE USING (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "posvenda_bc_delete" ON public.posvenda_base_conhecimento
  FOR DELETE USING (
    public.is_franqueador()
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.posvenda_bc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posvenda_bc_updated_at
  BEFORE UPDATE ON public.posvenda_base_conhecimento
  FOR EACH ROW EXECUTE FUNCTION public.posvenda_bc_updated_at();

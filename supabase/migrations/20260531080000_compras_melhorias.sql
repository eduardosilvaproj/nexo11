-- ============================================================
-- Compras module improvements: cotacoes, estoque minimo, ordens
-- ============================================================

-- Cotações de fornecedores
CREATE TABLE IF NOT EXISTS public.compras_cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id UUID NOT NULL,
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  itens JSONB NOT NULL DEFAULT '[]',
  prazo_entrega TEXT,
  valor_total NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for compras_cotacoes
ALTER TABLE public.compras_cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_cotacoes_select" ON public.compras_cotacoes
  FOR SELECT USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "compras_cotacoes_insert" ON public.compras_cotacoes
  FOR INSERT WITH CHECK (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "compras_cotacoes_update" ON public.compras_cotacoes
  FOR UPDATE USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_compras_cotacoes_loja ON public.compras_cotacoes(loja_id);
CREATE INDEX IF NOT EXISTS idx_compras_cotacoes_requisicao ON public.compras_cotacoes(requisicao_id);
CREATE INDEX IF NOT EXISTS idx_compras_cotacoes_fornecedor ON public.compras_cotacoes(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_cotacoes_status ON public.compras_cotacoes(status);


-- Estoque mínimo
CREATE TABLE IF NOT EXISTS public.compras_estoque_minimo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  nome TEXT NOT NULL,
  quantidade_atual NUMERIC(10,2) DEFAULT 0,
  quantidade_minima NUMERIC(10,2) DEFAULT 0,
  unidade TEXT DEFAULT 'un',
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for compras_estoque_minimo
ALTER TABLE public.compras_estoque_minimo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_estoque_minimo_select" ON public.compras_estoque_minimo
  FOR SELECT USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "compras_estoque_minimo_insert" ON public.compras_estoque_minimo
  FOR INSERT WITH CHECK (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "compras_estoque_minimo_update" ON public.compras_estoque_minimo
  FOR UPDATE USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "compras_estoque_minimo_delete" ON public.compras_estoque_minimo
  FOR DELETE USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_compras_estoque_minimo_loja ON public.compras_estoque_minimo(loja_id);
CREATE INDEX IF NOT EXISTS idx_compras_estoque_minimo_fornecedor ON public.compras_estoque_minimo(fornecedor_id);


-- Ordens de compra
CREATE TABLE IF NOT EXISTS public.compras_ordens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  requisicao_id UUID,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  itens JSONB NOT NULL DEFAULT '[]',
  valor_total NUMERIC(14,2) DEFAULT 0,
  prazo_entrega DATE,
  condicao_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aguardando_aprovacao', 'aprovada', 'rejeitada', 'concluida')),
  aprovado_por UUID REFERENCES auth.users(id),
  motivo_rejeicao TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for compras_ordens
ALTER TABLE public.compras_ordens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_ordens_select" ON public.compras_ordens
  FOR SELECT USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "compras_ordens_insert" ON public.compras_ordens
  FOR INSERT WITH CHECK (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "compras_ordens_update" ON public.compras_ordens
  FOR UPDATE USING (
    loja_id IN (
      SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_compras_ordens_loja ON public.compras_ordens(loja_id);
CREATE INDEX IF NOT EXISTS idx_compras_ordens_status ON public.compras_ordens(status);
CREATE INDEX IF NOT EXISTS idx_compras_ordens_fornecedor ON public.compras_ordens(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_ordens_requisicao ON public.compras_ordens(requisicao_id);
CREATE INDEX IF NOT EXISTS idx_compras_ordens_created_at ON public.compras_ordens(created_at);

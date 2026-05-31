-- ============ Compras: Lançamento avulso ============

CREATE TABLE IF NOT EXISTS public.compras_avulsas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  fornecedor_nome TEXT NOT NULL,
  itens JSONB NOT NULL DEFAULT '[]',
  valor_total NUMERIC(14,2) DEFAULT 0,
  forma_pagamento TEXT,
  nota_fiscal TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.compras_avulsas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_avulsas_select" ON public.compras_avulsas
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "compras_avulsas_insert" ON public.compras_avulsas
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "compras_avulsas_update" ON public.compras_avulsas
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "compras_avulsas_delete" ON public.compras_avulsas
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE INDEX IF NOT EXISTS idx_compras_avulsas_loja ON public.compras_avulsas(loja_id);
CREATE INDEX IF NOT EXISTS idx_compras_avulsas_created ON public.compras_avulsas(created_at DESC);

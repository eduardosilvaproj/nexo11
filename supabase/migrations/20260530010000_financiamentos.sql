-- ============ Financiamentos vinculados a contratos ============
-- Controla vendas via financeira com split de pagamento

CREATE TABLE IF NOT EXISTS public.financiamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  financeira_nome VARCHAR(100) NOT NULL,  -- Ex: BV, Losango, Cetelem
  valor_total_financiado DECIMAL(12,2) NOT NULL,

  -- Split: quanto a financeira paga direto à fábrica
  perc_direto_fabrica DECIMAL(5,2) DEFAULT 40,  -- ex: 40%
  valor_direto_fabrica DECIMAL(12,2) DEFAULT 0,

  -- Split: quanto entra na conta da loja
  perc_entrada_loja DECIMAL(5,2) DEFAULT 40,  -- ex: 40%
  valor_entrada_loja DECIMAL(12,2) DEFAULT 0,

  -- Intera: valor adicional que a loja precisa pagar
  valor_intera DECIMAL(12,2) DEFAULT 0,
  intera_paga BOOLEAN DEFAULT false,
  intera_data_pagamento DATE,

  -- Fornecedor/Fábrica destino
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome VARCHAR(200),

  -- Valor real que a loja precisa comprar de material
  valor_compra_material DECIMAL(12,2) DEFAULT 0,

  -- Taxas da financeira
  taxa_financeira DECIMAL(5,3) DEFAULT 0,  -- % cobrado pela financeira
  valor_taxa DECIMAL(12,2) DEFAULT 0,

  -- Controle
  status VARCHAR(30) DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'aprovado', 'liberado', 'pago_parcial', 'pago_total', 'cancelado'
  )),
  data_aprovacao DATE,
  data_liberacao DATE,
  numero_contrato_financeira VARCHAR(100),
  observacoes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.financiamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financiamentos_select" ON public.financiamentos
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro','vendedor'])
  );

CREATE POLICY "financiamentos_insert" ON public.financiamentos
  FOR INSERT TO authenticated WITH CHECK (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro','vendedor'])
  );

CREATE POLICY "financiamentos_update" ON public.financiamentos
  FOR UPDATE TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro'])
  );

CREATE POLICY "financiamentos_delete" ON public.financiamentos
  FOR DELETE TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'])
  );

CREATE INDEX idx_financiamentos_contrato ON public.financiamentos(contrato_id);
CREATE INDEX idx_financiamentos_loja ON public.financiamentos(loja_id);

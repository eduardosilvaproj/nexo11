CREATE TABLE IF NOT EXISTS public.financiamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  financeira_nome VARCHAR(100) NOT NULL,
  valor_total_financiado DECIMAL(12,2) NOT NULL,
  perc_direto_fabrica DECIMAL(5,2) DEFAULT 40,
  valor_direto_fabrica DECIMAL(12,2) DEFAULT 0,
  perc_entrada_loja DECIMAL(5,2) DEFAULT 40,
  valor_entrada_loja DECIMAL(12,2) DEFAULT 0,
  valor_intera DECIMAL(12,2) DEFAULT 0,
  intera_paga BOOLEAN DEFAULT false,
  intera_data_pagamento DATE,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome VARCHAR(200),
  valor_compra_material DECIMAL(12,2) DEFAULT 0,
  taxa_financeira DECIMAL(5,3) DEFAULT 0,
  valor_taxa DECIMAL(12,2) DEFAULT 0,
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financiamentos TO authenticated;
GRANT ALL ON public.financiamentos TO service_role;

ALTER TABLE public.financiamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financiamentos_select" ON public.financiamentos;
CREATE POLICY "financiamentos_select" ON public.financiamentos
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro','vendedor']::app_role[])
  );

DROP POLICY IF EXISTS "financiamentos_insert" ON public.financiamentos;
CREATE POLICY "financiamentos_insert" ON public.financiamentos
  FOR INSERT TO authenticated WITH CHECK (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro','vendedor']::app_role[])
  );

DROP POLICY IF EXISTS "financiamentos_update" ON public.financiamentos;
CREATE POLICY "financiamentos_update" ON public.financiamentos
  FOR UPDATE TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro']::app_role[])
  );

DROP POLICY IF EXISTS "financiamentos_delete" ON public.financiamentos;
CREATE POLICY "financiamentos_delete" ON public.financiamentos
  FOR DELETE TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin']::app_role[])
  );

CREATE INDEX IF NOT EXISTS idx_financiamentos_contrato ON public.financiamentos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_financiamentos_loja ON public.financiamentos(loja_id);

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS temperatura VARCHAR(10) DEFAULT 'morno' CHECK (temperatura IN ('quente', 'morno', 'frio')),
  ADD COLUMN IF NOT EXISTS score INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS motivo_perda TEXT,
  ADD COLUMN IF NOT EXISTS data_previsao_fechamento DATE;

ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'qualificacao';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'medicao_agendada';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'orcamento_enviado';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'negociacao';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'fechamento';
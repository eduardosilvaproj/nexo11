-- Enums
CREATE TYPE public.transacao_tipo AS ENUM ('receita', 'despesa');
CREATE TYPE public.transacao_status AS ENUM ('pendente', 'pago', 'cancelado');

-- Tabela
CREATE TABLE public.transacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  tipo public.transacao_tipo NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status public.transacao_status NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  criado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_transacoes_loja_venc ON public.transacoes(loja_id, data_vencimento);
CREATE INDEX idx_transacoes_contrato ON public.transacoes(contrato_id);

-- Trigger updated_at
CREATE TRIGGER trg_transacoes_updated_at
BEFORE UPDATE ON public.transacoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transacoes visíveis por gerente/admin/franqueador"
ON public.transacoes FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
  ))
);

CREATE POLICY "Transacoes insert por admin/gerente"
ON public.transacoes FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
  ))
);

CREATE POLICY "Transacoes update por admin/gerente"
ON public.transacoes FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
  ))
);

CREATE POLICY "Transacoes delete por admin/franqueador"
ON public.transacoes FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND has_role(auth.uid(), 'admin'::app_role))
);
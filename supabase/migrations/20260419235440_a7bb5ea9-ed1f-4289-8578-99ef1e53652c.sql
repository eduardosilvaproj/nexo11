-- Enums
DO $$ BEGIN
  CREATE TYPE public.papel_comissao_tipo AS ENUM (
    'vendedor','projetista','vendedor_projetista',
    'gerente_comercial','gerente_operacional','gerente_montagem'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.papel_comissao_regra AS ENUM (
    'contrato_assinado','por_ambiente_tecnico','por_ambiente_montagem'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela
CREATE TABLE IF NOT EXISTS public.papeis_comissao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo public.papel_comissao_tipo NOT NULL,
  percentual_padrao numeric(6,3) NOT NULL DEFAULT 0,
  regra_pagamento public.papel_comissao_regra NOT NULL DEFAULT 'contrato_assinado',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_papeis_comissao_loja ON public.papeis_comissao(loja_id);
CREATE INDEX IF NOT EXISTS idx_papeis_comissao_ativo ON public.papeis_comissao(loja_id, ativo);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_papeis_comissao_updated_at ON public.papeis_comissao;
CREATE TRIGGER trg_papeis_comissao_updated_at
BEFORE UPDATE ON public.papeis_comissao
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.papeis_comissao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Papeis comissao visíveis por loja/papel"
ON public.papeis_comissao FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'vendedor'::app_role)
  ))
);

CREATE POLICY "Papeis comissao insert por admin/gerente"
ON public.papeis_comissao FOR INSERT TO authenticated
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Papeis comissao update por admin/gerente"
ON public.papeis_comissao FOR UPDATE TO authenticated
USING (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
)
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Papeis comissao delete por admin/gerente"
ON public.papeis_comissao FOR DELETE TO authenticated
USING (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);
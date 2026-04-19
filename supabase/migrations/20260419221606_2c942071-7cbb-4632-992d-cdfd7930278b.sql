-- Enum status montagem
CREATE TYPE public.ambiente_status_montagem AS ENUM ('pendente', 'agendado', 'concluido', 'pago');

-- Tabela contrato_ambientes
CREATE TABLE public.contrato_ambientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor_bruto NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_liquido NUMERIC(14,2) NOT NULL DEFAULT 0,
  montador_id UUID REFERENCES public.montadores(id) ON DELETE SET NULL,
  percentual_montador NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_montador NUMERIC(14,2) NOT NULL DEFAULT 0,
  status_montagem public.ambiente_status_montagem NOT NULL DEFAULT 'pendente',
  data_montagem DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contrato_ambientes_contrato ON public.contrato_ambientes(contrato_id);
CREATE INDEX idx_contrato_ambientes_loja ON public.contrato_ambientes(loja_id);
CREATE INDEX idx_contrato_ambientes_montador ON public.contrato_ambientes(montador_id);

-- Trigger: calcular valor_liquido e valor_montador automaticamente
CREATE OR REPLACE FUNCTION public.contrato_ambiente_calcular()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.valor_liquido := ROUND(COALESCE(NEW.valor_bruto, 0) * (1 - COALESCE(NEW.desconto_percentual, 0) / 100), 2);
  NEW.valor_montador := ROUND(NEW.valor_liquido * COALESCE(NEW.percentual_montador, 0) / 100, 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contrato_ambiente_calcular
BEFORE INSERT OR UPDATE ON public.contrato_ambientes
FOR EACH ROW
EXECUTE FUNCTION public.contrato_ambiente_calcular();

-- RLS
ALTER TABLE public.contrato_ambientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambientes visíveis por contrato/papel"
ON public.contrato_ambientes FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    contrato_da_loja(contrato_id)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'tecnico'::app_role)
      OR has_role(auth.uid(), 'montador'::app_role)
    )
  )
);

CREATE POLICY "Ambientes insert por admin/gerente"
ON public.contrato_ambientes FOR INSERT
TO authenticated
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Ambientes update por admin/gerente"
ON public.contrato_ambientes FOR UPDATE
TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
)
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Ambientes delete por admin"
ON public.contrato_ambientes FOR DELETE
TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND has_role(auth.uid(), 'admin'::app_role)
);
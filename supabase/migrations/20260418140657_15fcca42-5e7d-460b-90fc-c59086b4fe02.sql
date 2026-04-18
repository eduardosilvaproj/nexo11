
-- Add trava_producao_ok column to contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS trava_producao_ok boolean NOT NULL DEFAULT false;

-- Status enum for producao_terceirizada
DO $$ BEGIN
  CREATE TYPE public.producao_terceirizada_status AS ENUM (
    'aguardando_fabricacao',
    'em_producao',
    'pronto_retirada',
    'atrasado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create producao_terceirizada table
CREATE TABLE IF NOT EXISTS public.producao_terceirizada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido text NOT NULL,
  oc text,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  data_prevista date,
  transportadora text,
  status public.producao_terceirizada_status NOT NULL DEFAULT 'aguardando_fabricacao',
  importado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_producao_terceirizada_contrato ON public.producao_terceirizada(contrato_id);
CREATE INDEX IF NOT EXISTS idx_producao_terceirizada_loja ON public.producao_terceirizada(loja_id);
CREATE INDEX IF NOT EXISTS idx_producao_terceirizada_status ON public.producao_terceirizada(status);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_producao_terceirizada_updated ON public.producao_terceirizada;
CREATE TRIGGER trg_producao_terceirizada_updated
  BEFORE UPDATE ON public.producao_terceirizada
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.producao_terceirizada ENABLE ROW LEVEL SECURITY;

-- SELECT: members of the loja or franqueador
CREATE POLICY "Producao terceirizada visivel por loja"
  ON public.producao_terceirizada FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      loja_id = current_loja_id()
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gerente'::app_role)
        OR has_role(auth.uid(), 'tecnico'::app_role)
      )
    )
  );

-- INSERT: admin/gerente/tecnico of the loja
CREATE POLICY "Producao terceirizada insert por papeis"
  ON public.producao_terceirizada FOR INSERT
  TO authenticated
  WITH CHECK (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'tecnico'::app_role)
    )
  );

-- UPDATE
CREATE POLICY "Producao terceirizada update por papeis"
  ON public.producao_terceirizada FOR UPDATE
  TO authenticated
  USING (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'tecnico'::app_role)
    )
  )
  WITH CHECK (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'tecnico'::app_role)
    )
  );

-- DELETE: admin/gerente
CREATE POLICY "Producao terceirizada delete por gerente/admin"
  ON public.producao_terceirizada FOR DELETE
  TO authenticated
  USING (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

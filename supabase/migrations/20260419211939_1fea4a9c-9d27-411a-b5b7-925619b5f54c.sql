
ALTER TABLE public.producao_terceirizada
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_entrada text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS vinculo_status text NOT NULL DEFAULT 'vinculado';

ALTER TABLE public.producao_terceirizada
  DROP CONSTRAINT IF EXISTS producao_terceirizada_tipo_entrada_check;
ALTER TABLE public.producao_terceirizada
  ADD CONSTRAINT producao_terceirizada_tipo_entrada_check
  CHECK (tipo_entrada IN ('manual','xml'));

ALTER TABLE public.producao_terceirizada
  DROP CONSTRAINT IF EXISTS producao_terceirizada_vinculo_status_check;
ALTER TABLE public.producao_terceirizada
  ADD CONSTRAINT producao_terceirizada_vinculo_status_check
  CHECK (vinculo_status IN ('vinculado','pendente'));

CREATE INDEX IF NOT EXISTS idx_producao_terceirizada_fornecedor
  ON public.producao_terceirizada(fornecedor_id);

ALTER TABLE public.producao_terceirizada
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.producao_terceirizada
  ADD COLUMN IF NOT EXISTS valor NUMERIC(14,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'producao_terceirizada_loja_pedido_unique'
  ) THEN
    ALTER TABLE public.producao_terceirizada
      ADD CONSTRAINT producao_terceirizada_loja_pedido_unique
      UNIQUE (loja_id, numero_pedido);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_producao_terceirizada_cliente_id
  ON public.producao_terceirizada(cliente_id);

CREATE INDEX IF NOT EXISTS idx_producao_terceirizada_data_prevista
  ON public.producao_terceirizada(data_prevista);

DO $$
DECLARE
  rec RECORD;
  c_id UUID;
BEGIN
  FOR rec IN
    SELECT pt.id, pt.loja_id, pt.cliente_nome
    FROM public.producao_terceirizada pt
    WHERE pt.cliente_id IS NULL
      AND pt.cliente_nome IS NOT NULL
      AND pt.loja_id IS NOT NULL
  LOOP
    SELECT c.id INTO c_id
    FROM public.clientes c
    WHERE c.loja_id = rec.loja_id
      AND LOWER(REGEXP_REPLACE(c.nome, ' - .*', '', 'g')) =
          LOWER(REGEXP_REPLACE(rec.cliente_nome, ' - .*', '', 'g'))
    LIMIT 1;

    IF c_id IS NOT NULL THEN
      UPDATE public.producao_terceirizada
      SET cliente_id = c_id
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
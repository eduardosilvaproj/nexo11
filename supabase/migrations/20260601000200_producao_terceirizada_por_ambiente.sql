-- =========================================================
-- MIGRATION: producao_terceirizada - 1 registro por ambiente
-- =========================================================
-- Antes: o parser do XML/XLSX agrupava todas as OCs (ambientes)
-- do mesmo cliente em 1 unico registro, juntando:
--   - oc: "AMBIENTE1, AMBIENTE2, AMBIENTE3, ..." (concatenado)
--   - data_prevista: a MENOR de todas (assumindo entrega unica)
--   - numero_pedido: o PRIMEIRO que aparecia no grupo
--
-- Depois: cada linha do XLSX vira 1 registro independente.
-- Isso preserva:
--   - numero_pedido unico por linha
--   - data_prevista individual por ambiente
--   - valor e prazo individual por ambiente
--
-- Alem disso, adicionamos:
--   - cliente_id: FK para clientes (match automatico por nome)
--   - valor: Vl Total do pedido (usado no DRE)
--   - UNIQUE (loja_id, numero_pedido): habilita upsert idempotente
-- =========================================================

-- 1. Adicionar colunas
ALTER TABLE public.producao_terceirizada
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.producao_terceirizada
  ADD COLUMN IF NOT EXISTS valor NUMERIC(14,2) NOT NULL DEFAULT 0;

-- 2. UNIQUE constraint para upsert idempotente por (loja + pedido)
-- numero_pedido ja eh unico por linha do XLSX (validado com o usuario)
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

-- 3. Indice para agrupamento por cliente (UI agrupa por nome do cliente)
CREATE INDEX IF NOT EXISTS idx_producao_terceirizada_cliente_id
  ON public.producao_terceirizada(cliente_id);

CREATE INDEX IF NOT EXISTS idx_producao_terceirizada_data_prevista
  ON public.producao_terceirizada(data_prevista);

-- 4. Backfill: tentar resolver cliente_id para registros ja importados
--    baseando-se em cliente_nome. Match por similaridade.
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
    -- Tenta match exato (case-insensitive) por nome base do cliente
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

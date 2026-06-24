-- =========================================================
-- MIGRATION: entregas.origem (Fase B da unificacao logistica)
-- =========================================================
-- Objetivo:
--   Permitir que um mesmo contrato tenha entregas INDEPENDENTES de
--   origens diferentes sem que as guardas anti-duplicata colidam:
--     - 'recebimento'  -> entrega gerada a partir da mercadoria da fabrica
--     - 'almoxarifado' -> entrega da saida de material do estoque
--     - 'manual'       -> criada direto na agenda pelo operador
--
--   Antes desta coluna, a guarda do RecebimentoDialog era
--   "existe QUALQUER entrega para o contrato? entao nao cria".
--   Isso impedia a saida independente do almoxarifado. Com 'origem',
--   a guarda passa a ser por (contrato_id, origem).
--
--   Coluna NOT NULL DEFAULT 'recebimento': todas as entregas ja
--   existentes sao tratadas como originadas do recebimento, que era
--   o unico fluxo automatico ate aqui. Nada e apagado ou movido.
-- =========================================================

ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'recebimento';

-- Restringe aos valores conhecidos do fluxo (idempotente).
DO $$ BEGIN
  ALTER TABLE public.entregas
    ADD CONSTRAINT entregas_origem_check
    CHECK (origem IN ('recebimento', 'almoxarifado', 'manual'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index para a guarda anti-duplicata por (contrato_id, origem).
CREATE INDEX IF NOT EXISTS idx_entregas_contrato_origem
  ON public.entregas(contrato_id, origem);

COMMENT ON COLUMN public.entregas.origem IS
  'Origem da entrega: recebimento (mercadoria da fabrica), almoxarifado (saida de estoque) ou manual. Usada nas guardas anti-duplicata por contrato+origem.';

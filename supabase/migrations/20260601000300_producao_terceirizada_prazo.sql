-- =========================================================
-- MIGRATION: adicionar coluna prazo em producao_terceirizada
-- =========================================================
-- A coluna prazo (string de prazos concatenada do fabricante, ex:
-- "50 - 20 - 6 - 8") eh usada no parser do XLSX para exibir os
-- prazos de cada etapa (producao, expedicao, transporte) por
-- ambiente, mas nao havia coluna no schema para armazena-la.
--
-- Sem essa coluna, o upsert falha com:
--   "Could not find the 'prazo' column of 'producao_terceirizada'
--    in the schema cache"
-- =========================================================

ALTER TABLE public.producao_terceirizada
  ADD COLUMN IF NOT EXISTS prazo text;

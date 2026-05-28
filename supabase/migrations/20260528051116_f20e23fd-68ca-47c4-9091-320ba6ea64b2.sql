-- Adicionar novos valores ao enum contrato_status (precisa estar em migração separada para poder ser usado depois)
ALTER TYPE public.contrato_status ADD VALUE IF NOT EXISTS 'medicao' AFTER 'comercial';
ALTER TYPE public.contrato_status ADD VALUE IF NOT EXISTS 'conferencia' AFTER 'medicao';
ALTER TYPE public.contrato_status ADD VALUE IF NOT EXISTS 'implantacao' AFTER 'conferencia';
ALTER TYPE public.contrato_status ADD VALUE IF NOT EXISTS 'entrada' AFTER 'producao';

-- Colunas de trava de etapa
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS trava_comercial_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trava_conferencia_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trava_implantacao_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trava_entrada_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trava_montagem_ok boolean NOT NULL DEFAULT false;
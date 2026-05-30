-- ============ Funil de Vendas Detalhado ============
-- Adiciona novas etapas ao enum lead_status e campos de scoring

-- Novos valores no enum (cada ADD VALUE precisa ser separado)
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'qualificacao' AFTER 'atendimento';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'medicao_agendada' AFTER 'visita';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'orcamento_enviado' AFTER 'proposta';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'negociacao' AFTER 'orcamento_enviado';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'fechamento' AFTER 'negociacao';

-- Novos campos na tabela leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS temperatura VARCHAR(10) DEFAULT 'morno' CHECK (temperatura IN ('quente', 'morno', 'frio')),
  ADD COLUMN IF NOT EXISTS score INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS motivo_perda TEXT,
  ADD COLUMN IF NOT EXISTS data_previsao_fechamento DATE;

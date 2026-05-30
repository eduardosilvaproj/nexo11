-- Migration: Add Asaas billing fields to financial tables
-- Run this to enable PIX/Boleto via Asaas

-- Add Asaas fields to contas_receber
ALTER TABLE financeiro_contas_receber
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_billing_type TEXT,
  ADD COLUMN IF NOT EXISTS asaas_payment_status TEXT,
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS asaas_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_due_date DATE,
  ADD COLUMN IF NOT EXISTS asaas_billing_date DATE,
  ADD COLUMN IF NOT EXISTS asaas_mdc5 TEXT;

COMMENT ON COLUMN financeiro_contas_receber.asaas_payment_id IS 'ID da cobrança no Asaas';
COMMENT ON COLUMN financeiro_contas_receber.asaas_billing_type IS 'Tipo: PIX, BOLETO, CREDIT_CARD, etc.';
COMMENT ON COLUMN financeiro_contas_receber.asaas_payment_status IS 'Status da cobrança: PENDING, CONFIRMED, etc.';

-- Add Asaas fields to contratos for customer reference
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_customer_created_at TIMESTAMPTZ;

COMMENT ON COLUMN contratos.asaas_customer_id IS 'ID do cliente no Asaas';
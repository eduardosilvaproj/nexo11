ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS cliente_cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS asaas_customer_id text;

ALTER TABLE public.financeiro_contas_receber
  ADD COLUMN IF NOT EXISTS asaas_payment_id text,
  ADD COLUMN IF NOT EXISTS asaas_billing_type text,
  ADD COLUMN IF NOT EXISTS asaas_payment_status text;
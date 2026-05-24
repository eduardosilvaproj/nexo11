-- Tabela de Contas a Receber
CREATE TABLE public.financeiro_contas_receber (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    contrato_id UUID REFERENCES public.contratos(id),
    cliente_id UUID REFERENCES public.clientes(id),
    descricao TEXT NOT NULL,
    valor NUMERIC NOT NULL DEFAULT 0 CHECK (valor >= 0),
    vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
    forma_pagamento TEXT,
    parcela_numero INTEGER,
    parcela_total INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Contas a Pagar
CREATE TABLE public.financeiro_contas_pagar (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    contrato_id UUID REFERENCES public.contratos(id),
    fornecedor_id UUID REFERENCES public.fornecedores(id),
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC NOT NULL DEFAULT 0 CHECK (valor >= 0),
    vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
    forma_pagamento TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.financeiro_contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_contas_pagar ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their store's receivables" ON public.financeiro_contas_receber
    FOR SELECT USING (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "Users can manage their store's receivables" ON public.financeiro_contas_receber
    FOR ALL USING (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "Users can view their store's payables" ON public.financeiro_contas_pagar
    FOR SELECT USING (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "Users can manage their store's payables" ON public.financeiro_contas_pagar
    FOR ALL USING (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()));

-- Índices para performance
CREATE INDEX idx_receber_loja_venc ON public.financeiro_contas_receber(loja_id, vencimento);
CREATE INDEX idx_pagar_loja_venc ON public.financeiro_contas_pagar(loja_id, vencimento);
CREATE INDEX idx_receber_contrato ON public.financeiro_contas_receber(contrato_id);
CREATE INDEX idx_pagar_contrato ON public.financeiro_contas_pagar(contrato_id);

-- Trigger para updated_at
CREATE TRIGGER update_receber_updated_at BEFORE UPDATE ON public.financeiro_contas_receber FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pagar_updated_at BEFORE UPDATE ON public.financeiro_contas_pagar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View unificada para fluxo de caixa (Opcional, mas útil)
CREATE OR REPLACE VIEW public.vw_fluxo_caixa AS
SELECT 
    id, loja_id, contrato_id, descricao, valor, vencimento as data, status, 'receita' as tipo, categoria as categoria, created_at 
FROM (SELECT id, loja_id, contrato_id, descricao, valor, vencimento, status, 'Venda' as categoria, created_at FROM public.financeiro_contas_receber) r
UNION ALL
SELECT 
    id, loja_id, contrato_id, descricao, valor, vencimento as data, status, 'despesa' as tipo, categoria, created_at 
FROM public.financeiro_contas_pagar;

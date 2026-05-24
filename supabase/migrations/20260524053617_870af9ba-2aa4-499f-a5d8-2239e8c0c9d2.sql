-- Create documentos_emitidos table
CREATE TABLE public.documentos_emitidos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
    entidade_tipo TEXT NOT NULL, -- 'contrato', 'compra', 'parcela', etc.
    entidade_id UUID,
    tipo TEXT NOT NULL, -- 'contrato', 'ordem_compra', 'ordem_separacao', 'romaneio_entrega', 'ordem_montagem', 'recibo_pagamento', 'relatorio_financeiro_contrato', 'termo_entrega'
    numero TEXT,
    titulo TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'emitido', -- 'emitido', 'cancelado'
    arquivo_url TEXT,
    dados_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    emitido_por UUID REFERENCES auth.users(id),
    emitido_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    cancelado_em TIMESTAMP WITH TIME ZONE,
    motivo_cancelamento TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_documentos_loja ON public.documentos_emitidos(loja_id);
CREATE INDEX idx_documentos_contrato ON public.documentos_emitidos(contrato_id);
CREATE INDEX idx_documentos_tipo ON public.documentos_emitidos(tipo);
CREATE INDEX idx_documentos_entidade ON public.documentos_emitidos(entidade_tipo, entidade_id);
CREATE INDEX idx_documentos_emitido_em ON public.documentos_emitidos(emitido_em);

-- RLS Policies

-- 1. Everyone can view documents from their own shop
CREATE POLICY "Users can view documents from their shop"
ON public.documentos_emitidos
FOR SELECT
USING (
  loja_id IN (
    SELECT loja_id FROM public.usuarios_lojas WHERE user_id = auth.uid()
  )
);

-- 2. Insertion
CREATE POLICY "Users can insert documents for their shop"
ON public.documentos_emitidos
FOR INSERT
WITH CHECK (
  loja_id IN (
    SELECT loja_id FROM public.usuarios_lojas WHERE user_id = auth.uid()
  )
);

-- 3. Update (for cancellation)
CREATE POLICY "Users can update documents for their shop"
ON public.documentos_emitidos
FOR UPDATE
USING (
  loja_id IN (
    SELECT loja_id FROM public.usuarios_lojas WHERE user_id = auth.uid()
  )
);

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_documentos_updated_at
BEFORE UPDATE ON public.documentos_emitidos
FOR EACH ROW
EXECUTE FUNCTION public.update_documentos_updated_at();

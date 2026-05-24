-- Create contrato_eventos table
CREATE TABLE IF NOT EXISTS public.contrato_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    contrato_id UUID NOT NULL REFERENCES public.contratos(id),
    usuario_id UUID REFERENCES auth.users(id),
    tipo TEXT NOT NULL,
    modulo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    entidade_tipo TEXT,
    entidade_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contrato_eventos ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contrato_eventos_contrato_id ON public.contrato_eventos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_eventos_loja_id ON public.contrato_eventos(loja_id);
CREATE INDEX IF NOT EXISTS idx_contrato_eventos_modulo ON public.contrato_eventos(modulo);
CREATE INDEX IF NOT EXISTS idx_contrato_eventos_tipo ON public.contrato_eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_contrato_eventos_created_at ON public.contrato_eventos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contrato_eventos_entidade ON public.contrato_eventos(entidade_tipo, entidade_id);

-- RLS Policies
CREATE POLICY "Users can view events from their store"
ON public.contrato_eventos
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_publico up
        WHERE up.id = auth.uid()
        AND up.loja_id = contrato_eventos.loja_id
    )
);

CREATE POLICY "System/Users can insert events for their store"
ON public.contrato_eventos
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.contratos c
        JOIN public.usuarios_publico up ON up.id = auth.uid()
        WHERE c.id = contrato_eventos.contrato_id
        AND c.loja_id = up.loja_id
    )
);

-- Backfill initial events from existing data
DO $$
BEGIN
    -- 1. Contratos criados
    INSERT INTO public.contrato_eventos (loja_id, contrato_id, tipo, modulo, titulo, descricao, created_at)
    SELECT loja_id, id, 'contrato_criado', 'comercial', 'Contrato Criado', 'Contrato registrado no sistema.', created_at
    FROM public.contratos
    ON CONFLICT DO NOTHING;

    -- 2. Parcelas geradas (Financeiro)
    INSERT INTO public.contrato_eventos (loja_id, contrato_id, tipo, modulo, titulo, descricao, entidade_tipo, entidade_id, created_at)
    SELECT c.loja_id, cr.contrato_id, 'parcela_gerada', 'financeiro', 
           'Parcela ' || cr.parcela_numero || '/' || cr.total_parcelas || ' Gerada',
           'Valor: R$ ' || cr.valor, 'financeiro_contas_receber', cr.id, cr.created_at
    FROM public.financeiro_contas_receber cr
    JOIN public.contratos c ON c.id = cr.contrato_id
    ON CONFLICT DO NOTHING;

    -- 3. Recebimentos (Financeiro)
    INSERT INTO public.contrato_eventos (loja_id, contrato_id, tipo, modulo, titulo, descricao, entidade_tipo, entidade_id, created_at)
    SELECT c.loja_id, cr.contrato_id, 'pagamento_recebido', 'financeiro', 
           'Parcela ' || cr.parcela_numero || ' Recebida',
           'Pagamento confirmado.', 'financeiro_contas_receber', cr.id, cr.data_pagamento
    FROM public.financeiro_contas_receber cr
    JOIN public.contratos c ON c.id = cr.contrato_id
    WHERE cr.status = 'pago' AND cr.data_pagamento IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- 4. Movimentações de Estoque (Almoxarifado)
    INSERT INTO public.contrato_eventos (loja_id, contrato_id, tipo, modulo, titulo, descricao, entidade_tipo, entidade_id, created_at)
    SELECT c.loja_id, er.contrato_id, 'estoque_reservado', 'almoxarifado', 
           'Material Reservado',
           'Reserva de material realizada para o contrato.', 'estoque_reservas', er.id, er.created_at
    FROM public.estoque_reservas er
    JOIN public.contratos c ON c.id = er.contrato_id
    ON CONFLICT DO NOTHING;

    -- 5. Expedições (Logística)
    INSERT INTO public.contrato_eventos (loja_id, contrato_id, tipo, modulo, titulo, descricao, entidade_tipo, entidade_id, created_at)
    SELECT c.loja_id, ea.contrato_id, 'material_entregue', 'logistica', 
           'Material Entregue',
           'Expedição concluída e materiais entregues.', 'expedicoes_almoxarifado', ea.id, ea.created_at
    FROM public.expedicoes_almoxarifado ea
    JOIN public.contratos c ON c.id = ea.contrato_id
    WHERE ea.status = 'concluido'
    ON CONFLICT DO NOTHING;

    -- 6. Pós-venda
    INSERT INTO public.contrato_eventos (loja_id, contrato_id, tipo, modulo, titulo, descricao, entidade_tipo, entidade_id, created_at)
    SELECT c.loja_id, cpv.contrato_id, 'chamado_aberto', 'pos_venda', 
           'Chamado Aberto',
           cpv.descricao, 'chamados_pos_venda', cpv.id, cpv.created_at
    FROM public.chamados_pos_venda cpv
    JOIN public.contratos c ON c.id = cpv.contrato_id
    ON CONFLICT DO NOTHING;

END $$;

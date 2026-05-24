-- Criar tabela de expedições de almoxarifado
CREATE TABLE IF NOT EXISTS public.expedicoes_almoxarifado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    contrato_id UUID NOT NULL REFERENCES public.contratos(id),
    requisicao_id UUID NOT NULL REFERENCES public.requisicoes_compra(id),
    movimentacao_id UUID NOT NULL REFERENCES public.estoque_movimentacoes(id),
    item_id UUID NOT NULL REFERENCES public.estoque_itens(id),
    quantidade NUMERIC NOT NULL CHECK (quantidade > 0),
    status TEXT NOT NULL DEFAULT 'separado' CHECK (status IN ('separado', 'carregado', 'entregue', 'cancelado')),
    carregado_at TIMESTAMP WITH TIME ZONE,
    entregue_at TIMESTAMP WITH TIME ZONE,
    responsavel_carregamento_id UUID REFERENCES auth.users(id),
    responsavel_entrega_id UUID REFERENCES auth.users(id),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.expedicoes_almoxarifado ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários podem ver expedições da sua loja" 
ON public.expedicoes_almoxarifado FOR SELECT 
USING (loja_id IN (SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar expedições da sua loja" 
ON public.expedicoes_almoxarifado FOR UPDATE 
USING (loja_id IN (SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem inserir expedições da sua loja" 
ON public.expedicoes_almoxarifado FOR INSERT 
WITH CHECK (loja_id IN (SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_expedicoes_almoxarifado_updated_at
BEFORE UPDATE ON public.expedicoes_almoxarifado
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar a RPC de baixa de estoque para incluir a criação da expedição
CREATE OR REPLACE FUNCTION public.baixar_estoque_requisicao(
    p_requisicao_id UUID,
    p_reserva_id UUID,
    p_item_id_ou_idx TEXT,
    p_usuario_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reserva RECORD;
    v_item_estoque RECORD;
    v_requisicao RECORD;
    v_itens_json JSONB;
    v_novo_itens_json JSONB;
    v_item_extra_id UUID;
    v_idx INTEGER;
    v_movimentacao_id UUID;
    v_loja_id UUID;
    v_expedicao_id UUID;
BEGIN
    -- 1. Bloquear e validar reserva
    SELECT * INTO v_reserva 
    FROM public.estoque_reservas 
    WHERE id = p_reserva_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva não encontrada.';
    END IF;

    IF v_reserva.status <> 'reservada' THEN
        RAISE EXCEPTION 'A reserva não está em estado válido para baixa (Status atual: %).', v_reserva.status;
    END IF;

    v_loja_id := v_reserva.loja_id;

    -- 2. Bloquear e validar item de estoque
    SELECT * INTO v_item_estoque 
    FROM public.estoque_itens 
    WHERE id = v_reserva.item_id
    FOR UPDATE;

    IF v_item_estoque.quantidade_total < v_reserva.quantidade THEN
        RAISE EXCEPTION 'Saldo insuficiente no estoque para efetivar a baixa.';
    END IF;

    -- 3. Bloquear e validar requisição
    SELECT * INTO v_requisicao 
    FROM public.requisicoes_compra 
    WHERE id = p_requisicao_id
    FOR UPDATE;

    v_itens_json := v_requisicao.itens_json;

    -- 4. Localizar índice no JSON
    BEGIN
        v_item_extra_id := p_item_id_ou_idx::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_idx := p_item_id_ou_idx::INTEGER;
    END;

    IF v_item_extra_id IS NOT NULL THEN
        SELECT (idx - 1) INTO v_idx
        FROM jsonb_array_elements(v_itens_json) WITH ORDINALITY AS t(elem, idx)
        WHERE (elem->>'id')::UUID = v_item_extra_id;
    END IF;

    IF v_idx IS NULL OR v_idx < 0 OR v_idx >= jsonb_array_length(v_itens_json) THEN
        RAISE EXCEPTION 'Item não encontrado na requisição.';
    END IF;

    IF (v_itens_json->v_idx->>'estoque_baixado')::BOOLEAN = true THEN
        RAISE EXCEPTION 'Este item já foi baixado anteriormente.';
    END IF;

    -- 5. Registrar movimentação
    INSERT INTO public.estoque_movimentacoes (
        tipo,
        subtipo,
        item_id,
        loja_id,
        contrato_id,
        quantidade,
        valor_unitario,
        valor_total,
        motivo,
        observacoes,
        data,
        responsavel_id
    ) VALUES (
        'saida',
        'separacao_requisicao',
        v_reserva.item_id,
        v_loja_id,
        v_reserva.contrato_id,
        v_reserva.quantidade,
        COALESCE(v_item_estoque.custo_medio_unitario, 0),
        COALESCE(v_item_estoque.custo_medio_unitario, 0) * v_reserva.quantidade,
        'Baixa de item reservado para requisição #' || p_requisicao_id,
        'Operação atômica via RPC',
        NOW(),
        p_usuario_id
    ) RETURNING id INTO v_movimentacao_id;

    -- 6. Criar registro de expedição automática
    INSERT INTO public.expedicoes_almoxarifado (
        loja_id,
        contrato_id,
        requisicao_id,
        movimentacao_id,
        item_id,
        quantidade,
        status
    ) VALUES (
        v_loja_id,
        v_reserva.contrato_id,
        p_requisicao_id,
        v_movimentacao_id,
        v_reserva.item_id,
        v_reserva.quantidade,
        'separado'
    ) RETURNING id INTO v_expedicao_id;

    -- 7. Atualizar estoque_itens
    UPDATE public.estoque_itens 
    SET quantidade_total = quantidade_total - v_reserva.quantidade,
        quantidade_reservada = quantidade_reservada - v_reserva.quantidade,
        updated_at = NOW()
    WHERE id = v_reserva.item_id;

    -- 8. Atualizar reserva
    UPDATE public.estoque_reservas 
    SET status = 'baixada',
        liberada_at = NOW(),
        updated_at = NOW()
    WHERE id = p_reserva_id;

    -- 9. Atualizar JSON da requisição
    v_novo_itens_json := jsonb_set(v_itens_json, ARRAY[v_idx::text], 
        (v_itens_json->v_idx) || jsonb_build_object(
            'status', 'concluido',
            'estoque_baixado', true
        )
    );

    UPDATE public.requisicoes_compra 
    SET itens_json = v_novo_itens_json,
        updated_at = NOW()
    WHERE id = p_requisicao_id;

    -- 10. Atualizar ambiente_itens_extras se existir
    IF v_item_extra_id IS NOT NULL THEN
        UPDATE public.ambiente_itens_extras
        SET status_compra = 'recebido',
            updated_at = NOW()
        WHERE id = v_item_extra_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'movimentacao_id', v_movimentacao_id,
        'expedicao_id', v_expedicao_id
    );
END;
$$;

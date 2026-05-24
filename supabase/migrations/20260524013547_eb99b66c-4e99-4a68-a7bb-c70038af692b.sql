-- Função para reservar estoque de forma atômica
CREATE OR REPLACE FUNCTION public.reservar_estoque_requisicao(
    p_requisicao_id UUID,
    p_item_id_ou_idx TEXT, -- Pode ser o ID do item extra ou o índice no JSON
    p_item_estoque_id UUID,
    p_quantidade NUMERIC,
    p_contrato_id UUID,
    p_loja_id UUID,
    p_usuario_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item_estoque RECORD;
    v_reserva_id UUID;
    v_requisicao RECORD;
    v_itens_json JSONB;
    v_novo_itens_json JSONB;
    v_disponivel NUMERIC;
    v_item_extra_id UUID;
    v_idx INTEGER;
BEGIN
    -- 1. Validar quantidade
    IF p_quantidade <= 0 THEN
        RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
    END IF;

    -- 2. Bloquear e validar item de estoque
    SELECT * INTO v_item_estoque 
    FROM public.estoque_itens 
    WHERE id = p_item_estoque_id AND loja_id = p_loja_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item de estoque não encontrado ou não pertence a esta loja.';
    END IF;

    v_disponivel := COALESCE(v_item_estoque.quantidade_total, 0) - COALESCE(v_item_estoque.quantidade_reservada, 0);
    IF v_disponivel < p_quantidade THEN
        RAISE EXCEPTION 'Saldo insuficiente. Disponível: %, Solicitado: %', v_disponivel, p_quantidade;
    END IF;

    -- 3. Bloquear e validar requisição
    SELECT * INTO v_requisicao 
    FROM public.requisicoes_compra 
    WHERE id = p_requisicao_id AND loja_id = p_loja_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Requisição não encontrada.';
    END IF;

    v_itens_json := v_requisicao.itens_json;

    -- 4. Identificar o item no JSON e validar se já tem reserva
    -- Tentamos converter p_item_id_ou_idx para UUID primeiro, se falhar usamos como índice
    BEGIN
        v_item_extra_id := p_item_id_ou_idx::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_idx := p_item_id_ou_idx::INTEGER;
    END;

    IF v_item_extra_id IS NOT NULL THEN
        -- Buscar pelo ID do item extra dentro do JSON
        SELECT (idx - 1) INTO v_idx
        FROM jsonb_array_elements(v_itens_json) WITH ORDINALITY AS t(elem, idx)
        WHERE (elem->>'id')::UUID = v_item_extra_id;
    END IF;

    IF v_idx IS NULL OR v_idx < 0 OR v_idx >= jsonb_array_length(v_itens_json) THEN
        RAISE EXCEPTION 'Item não encontrado na requisição.';
    END IF;

    IF (v_itens_json->v_idx->>'reserva_estoque_id') IS NOT NULL THEN
        RAISE EXCEPTION 'Este item já possui uma reserva ativa.';
    END IF;

    -- 5. Criar a reserva
    INSERT INTO public.estoque_reservas (
        item_id,
        contrato_id,
        loja_id,
        quantidade,
        origem_conferencia_id,
        observacoes,
        status
    ) VALUES (
        p_item_estoque_id,
        p_contrato_id,
        p_loja_id,
        p_quantidade,
        v_item_extra_id,
        'Reserva automática via módulo de Compras',
        'reservada'
    ) RETURNING id INTO v_reserva_id;

    -- 6. Atualizar estoque_itens
    UPDATE public.estoque_itens 
    SET quantidade_reservada = COALESCE(quantidade_reservada, 0) + p_quantidade,
        updated_at = NOW()
    WHERE id = p_item_estoque_id;

    -- 7. Atualizar JSON da requisição
    v_novo_itens_json := jsonb_set(v_itens_json, ARRAY[v_idx::text], 
        (v_itens_json->v_idx) || jsonb_build_object(
            'item_estoque_id', p_item_estoque_id,
            'reserva_estoque_id', v_reserva_id,
            'quantidade_em_estoque', v_item_estoque.quantidade_total,
            'divergencia_estoque', false
        )
    );

    UPDATE public.requisicoes_compra 
    SET itens_json = v_novo_itens_json,
        updated_at = NOW()
    WHERE id = p_requisicao_id;

    -- 8. Atualizar ambiente_itens_extras se existir
    IF v_item_extra_id IS NOT NULL THEN
        UPDATE public.ambiente_itens_extras
        SET item_estoque_id = p_item_estoque_id,
            reserva_id = v_reserva_id,
            quantidade_em_estoque = v_item_estoque.quantidade_total,
            divergencia_estoque = false,
            origem = 'almoxarifado',
            updated_at = NOW()
        WHERE id = v_item_extra_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reserva_id', v_reserva_id,
        'quantidade_reservada_atual', COALESCE(v_item_estoque.quantidade_reservada, 0) + p_quantidade
    );
END;
$$;

-- Função para baixar estoque de forma atômica
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

    -- 6. Atualizar estoque_itens
    UPDATE public.estoque_itens 
    SET quantidade_total = quantidade_total - v_reserva.quantidade,
        quantidade_reservada = quantidade_reservada - v_reserva.quantidade,
        updated_at = NOW()
    WHERE id = v_reserva.item_id;

    -- 7. Atualizar reserva
    UPDATE public.estoque_reservas 
    SET status = 'baixada',
        liberada_at = NOW(),
        updated_at = NOW()
    WHERE id = p_reserva_id;

    -- 8. Atualizar JSON da requisição
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

    -- 9. Atualizar ambiente_itens_extras se existir
    IF v_item_extra_id IS NOT NULL THEN
        UPDATE public.ambiente_itens_extras
        SET status_compra = 'recebido',
            updated_at = NOW()
        WHERE id = v_item_extra_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'movimentacao_id', v_movimentacao_id
    );
END;
$$;

-- Função para cancelar reserva de forma atômica
CREATE OR REPLACE FUNCTION public.cancelar_reserva_estoque_requisicao(
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
    v_requisicao RECORD;
    v_itens_json JSONB;
    v_novo_itens_json JSONB;
    v_item_extra_id UUID;
    v_idx INTEGER;
BEGIN
    -- 1. Bloquear e validar reserva
    SELECT * INTO v_reserva 
    FROM public.estoque_reservas 
    WHERE id = p_reserva_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva não encontrada.';
    END IF;

    IF v_reserva.status = 'baixada' THEN
        RAISE EXCEPTION 'Não é possível cancelar uma reserva que já foi baixada.';
    END IF;

    -- 2. Atualizar estoque_itens
    UPDATE public.estoque_itens 
    SET quantidade_reservada = GREATEST(0, COALESCE(quantidade_reservada, 0) - v_reserva.quantidade),
        updated_at = NOW()
    WHERE id = v_reserva.item_id;

    -- 3. Atualizar reserva
    UPDATE public.estoque_reservas 
    SET status = 'cancelada',
        updated_at = NOW()
    WHERE id = p_reserva_id;

    -- 4. Bloquear e validar requisição
    SELECT * INTO v_requisicao 
    FROM public.requisicoes_compra 
    WHERE id = p_requisicao_id
    FOR UPDATE;

    v_itens_json := v_requisicao.itens_json;

    -- 5. Localizar índice no JSON
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

    IF v_idx IS NOT NULL AND v_idx >= 0 AND v_idx < jsonb_array_length(v_itens_json) THEN
        -- 6. Limpar campos no JSON
        v_novo_itens_json := jsonb_set(v_itens_json, ARRAY[v_idx::text], 
            (v_itens_json->v_idx) - 'item_estoque_id' - 'reserva_estoque_id' - 'quantidade_em_estoque' - 'divergencia_estoque' - 'estoque_baixado'
        );

        UPDATE public.requisicoes_compra 
        SET itens_json = v_novo_itens_json,
            updated_at = NOW()
        WHERE id = p_requisicao_id;

        -- 7. Limpar ambiente_itens_extras se existir
        IF v_item_extra_id IS NOT NULL THEN
            UPDATE public.ambiente_itens_extras
            SET item_estoque_id = NULL,
                reserva_id = NULL,
                quantidade_em_estoque = NULL,
                divergencia_estoque = false,
                updated_at = NOW()
            WHERE id = v_item_extra_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

DO $$
DECLARE
    v_loja_id UUID;
    v_contrato_1_id UUID;
    v_contrato_2_id UUID;
    v_contrato_3_id UUID;
BEGIN
    -- Busca uma loja existente
    SELECT id INTO v_loja_id FROM public.lojas LIMIT 1;
    
    -- Se não houver loja, cria uma para o teste
    IF v_loja_id IS NULL THEN
        INSERT INTO public.lojas (nome) VALUES ('Loja Teste') RETURNING id INTO v_loja_id;
    END IF;

    -- 1. Contrato Ana Paula Ferreira
    INSERT INTO public.contratos (loja_id, cliente_nome, status)
    VALUES (v_loja_id, 'Ana Paula Ferreira', 'pos_venda')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_contrato_1_id;

    IF v_contrato_1_id IS NULL THEN
        SELECT id INTO v_contrato_1_id FROM public.contratos WHERE cliente_nome = 'Ana Paula Ferreira' LIMIT 1;
    END IF;

    -- Mensagens Contrato 1 (Ana Paula)
    INSERT INTO public.chat_mensagens (contrato_id, remetente_tipo, remetente_nome, mensagem, lida, created_at)
    VALUES 
    (v_contrato_1_id, 'cliente', 'Ana Paula Ferreira', 'Boa tarde! Queria saber se tem previsão de entrega para essa semana?', true, now() - interval '1 day' - interval '4 hours'),
    (v_contrato_1_id, 'equipe', 'Marcos', 'Boa tarde Ana! Sim, temos previsão para quinta-feira dia 28. Vamos confirmar amanhã.', true, now() - interval '1 day' - interval '3 hours 45 minutes'),
    (v_contrato_1_id, 'cliente', 'Ana Paula Ferreira', 'Ótimo! E a montagem, fica para o mesmo dia?', true, now() - interval '1 day' - interval '3 hours 30 minutes'),
    (v_contrato_1_id, 'equipe', 'Marcos', 'A montagem ficará para o dia seguinte, sexta dia 29, a partir das 8h.', true, now() - interval '1 day' - interval '3 hours 15 minutes'),
    (v_contrato_1_id, 'cliente', 'Ana Paula Ferreira', 'Perfeito, obrigada!', true, now() - interval '1 day' - interval '3 hours');

    -- 2. Contrato Carlos Eduardo Santos
    INSERT INTO public.contratos (loja_id, cliente_nome, status)
    VALUES (v_loja_id, 'Carlos Eduardo Santos', 'comercial')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_contrato_2_id;

    IF v_contrato_2_id IS NULL THEN
        SELECT id INTO v_contrato_2_id FROM public.contratos WHERE cliente_nome = 'Carlos Eduardo Santos' LIMIT 1;
    END IF;

    -- Mensagens Contrato 2 (Carlos Eduardo)
    -- Para aparecer como não lida, a última mensagem do cliente deve ser lida = false
    INSERT INTO public.chat_mensagens (contrato_id, remetente_tipo, remetente_nome, mensagem, lida, created_at)
    VALUES 
    (v_contrato_2_id, 'cliente', 'Carlos Eduardo Santos', 'Olá, tenho uma dúvida sobre o acabamento do armário da cozinha', true, now() - interval '5 hours'),
    (v_contrato_2_id, 'equipe', 'Julia', 'Olá Carlos! Pode falar, como posso ajudar?', true, now() - interval '4 hours 50 minutes'),
    (v_contrato_2_id, 'equipe', 'Julia', 'Vou verificar com a produção e te retorno em breve!', true, now() - interval '4 hours 30 minutes'),
    (v_contrato_2_id, 'cliente', 'Carlos Eduardo Santos', 'Escolhi o fosco branco mas quero mudar para acetinado. Ainda dá tempo?', false, now() - interval '4 hours');

    -- 3. Contrato Fernanda Lima
    INSERT INTO public.contratos (loja_id, cliente_nome, status)
    VALUES (v_loja_id, 'Fernanda Lima', 'logistica')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_contrato_3_id;

    IF v_contrato_3_id IS NULL THEN
        SELECT id INTO v_contrato_3_id FROM public.contratos WHERE cliente_nome = 'Fernanda Lima' LIMIT 1;
    END IF;

    -- Mensagens Contrato 3 (Fernanda Lima)
    INSERT INTO public.chat_mensagens (contrato_id, remetente_tipo, remetente_nome, mensagem, lida, created_at)
    VALUES 
    (v_contrato_3_id, 'cliente', 'Fernanda Lima', 'Bom dia! Preciso remarcar a entrega, viajo semana que vem', false, now() - interval '2 hours');

END $$;
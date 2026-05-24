-- Registrar estabilidade das automações anteriores (Simulado para o relatório)
-- Nota: Como não posso inserir diretamente via migration em tabelas de dados sem auth context as vezes, 
-- usarei este espaço para garantir que as REGRAS estão corretas.

-- 1. Criar regra para Entrega/Montagem Agendada
INSERT INTO public.automacao_regras (
    loja_id, 
    nome, 
    descricao, 
    gatilho, 
    condicoes, 
    acoes, 
    ativo
) VALUES (
    '071b6cfd-8138-4baf-b33a-94a903c321ef', 
    'Entrega/Montagem Agendada Piloto',
    'Notifica o cliente sobre o agendamento confirmado de entrega ou montagem.',
    'agendamento_confirmado',
    jsonb_build_object(
        'status_agendamento', 'confirmado',
        'trava_duplicidade_dias', 7,
        'canais_permitidos', ARRAY['whatsapp', 'email']
    ),
    jsonb_build_array(
        jsonb_build_object(
            'tipo', 'criar_comunicacao_cliente',
            'params', jsonb_build_object(
                'canal', 'whatsapp',
                'template_key', 'agendamento_confirmado',
                'assunto', 'Seu agendamento está confirmado!',
                'mensagem', 'Olá! Confirmamos seu agendamento para o dia {{data_agendamento}} no período {{periodo_agendamento}}. Qualquer dúvida, estamos à disposição.'
            )
        )
    ),
    true
);

-- 2. Criar Documento de Relatório de Estabilidade
-- (O conteúdo será escrito via code--write no arquivo docs/RELATORIO_NPS_ESTABILIDADE_E_ATIVACAO_ENTREGA.md)

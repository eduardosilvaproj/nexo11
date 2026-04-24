DO $$ 
DECLARE
    contract_ids UUID[];
BEGIN
    SELECT array_agg(id) INTO contract_ids FROM contratos 
    WHERE cliente_nome ILIKE '%Teste%' 
    OR cliente_nome ILIKE '%BBBBBBBB%' 
    OR id = 'bbbbbbbb-0000-0000-0000-000000000001';

    IF contract_ids IS NOT NULL THEN
        -- Level 3 (grandchildren)
        DELETE FROM solicitacoes_desconto WHERE orcamento_id IN (SELECT id FROM orcamentos WHERE contrato_id = ANY(contract_ids));

        -- Level 2 (children)
        DELETE FROM entregas WHERE contrato_id = ANY(contract_ids);
        DELETE FROM producao_interna WHERE contrato_id = ANY(contract_ids);
        DELETE FROM portal_acessos WHERE contrato_id = ANY(contract_ids);
        DELETE FROM orcamentos_promob WHERE contrato_id = ANY(contract_ids);
        DELETE FROM retrabalhos WHERE contrato_id = ANY(contract_ids);
        DELETE FROM contrato_logs WHERE contrato_id = ANY(contract_ids);
        DELETE FROM notificacoes WHERE contrato_id = ANY(contract_ids);
        DELETE FROM conferencia_ambientes WHERE contrato_id = ANY(contract_ids);
        DELETE FROM transacoes WHERE contrato_id = ANY(contract_ids);
        DELETE FROM chamados_pos_venda WHERE contrato_id = ANY(contract_ids);
        DELETE FROM agendamentos_montagem WHERE contrato_id = ANY(contract_ids);
        DELETE FROM ordens_producao WHERE contrato_id = ANY(contract_ids);
        DELETE FROM dre_contrato WHERE contrato_id = ANY(contract_ids);
        DELETE FROM contrato_ambientes WHERE contrato_id = ANY(contract_ids);
        DELETE FROM requisicoes_compra WHERE contrato_id = ANY(contract_ids);
        DELETE FROM ambiente_itens_extras WHERE contrato_id = ANY(contract_ids);
        DELETE FROM checklists_tecnicos WHERE contrato_id = ANY(contract_ids);
        DELETE FROM portal_tokens WHERE contrato_id = ANY(contract_ids);
        DELETE FROM chat_mensagens WHERE contrato_id = ANY(contract_ids);
        DELETE FROM comissoes WHERE contrato_id = ANY(contract_ids);
        DELETE FROM producao_terceirizada WHERE contrato_id = ANY(contract_ids);
        DELETE FROM orcamentos WHERE contrato_id = ANY(contract_ids);

        -- Level 1 (parent)
        DELETE FROM contratos WHERE id = ANY(contract_ids);
    END IF;
END $$;
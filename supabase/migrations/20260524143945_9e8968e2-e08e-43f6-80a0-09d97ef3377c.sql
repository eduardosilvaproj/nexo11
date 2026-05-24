-- 1. Corrigir o Trigger de NPS Pós-Venda para o schema real (sem coluna loja_id em chamados_pos_venda)
CREATE OR REPLACE FUNCTION public.trg_trigger_nps_pos_venda_resolvido()
RETURNS TRIGGER AS $$
DECLARE
  v_loja_id UUID;
  v_cliente_id UUID;
BEGIN
  -- Buscar loja e cliente do contrato
  SELECT loja_id, cliente_id INTO v_loja_id, v_cliente_id 
  FROM contratos 
  WHERE id = NEW.contrato_id;

  -- Se o status mudou para 'resolvido'
  IF (NEW.status = 'resolvido'::chamado_status AND OLD.status != 'resolvido'::chamado_status) THEN
    INSERT INTO contrato_eventos (contrato_id, loja_id, tipo, titulo, descricao, metadata)
    VALUES (
      NEW.contrato_id,
      v_loja_id,
      'pos_venda_resolvido',
      'Atendimento Resolvido',
      'Chamado de pós-venda finalizado com resolução confirmada.',
      jsonb_build_object(
        'chamado_id', NEW.id,
        'cliente_id', v_cliente_id,
        'tipo_atendimento', NEW.tipo
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Corrigir a função de debug para os tipos reais
CREATE OR REPLACE FUNCTION debug_trigger_nps_pos_venda_pilot() 
RETURNS void AS $$
DECLARE
  v_contrato_id UUID;
  v_chamado_id UUID;
BEGIN
  -- Buscar o contrato de teste
  SELECT id INTO v_contrato_id FROM contratos WHERE id = 'd5c26f18-7e0a-4541-9227-4693fc50f64d';

  -- Criar um chamado de teste se não existir (campos: contrato_id, tipo, descricao, status, custo)
  INSERT INTO chamados_pos_venda (contrato_id, tipo, descricao, status, custo)
  VALUES (v_contrato_id, 'assistencia'::chamado_tipo, 'Teste de automação NPS Pós-Venda', 'aberto'::chamado_status, 0)
  RETURNING id INTO v_chamado_id;

  -- Resolver o chamado para disparar o trigger
  UPDATE chamados_pos_venda SET status = 'resolvido'::chamado_status WHERE id = v_chamado_id;
END;
$$ LANGUAGE plpgsql;
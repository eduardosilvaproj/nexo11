-- Corrigir a função de teste para incluir o módulo obrigatório
CREATE OR REPLACE FUNCTION debug_trigger_nps_pilot() 
RETURNS void AS $$
DECLARE
  v_loja_id UUID;
  v_contrato_id UUID;
  v_cliente_id UUID;
BEGIN
  -- Buscar dados da loja piloto
  SELECT id INTO v_loja_id FROM lojas WHERE nome ILIKE '%Matriz Principal%' LIMIT 1;
  
  -- Buscar o contrato de teste
  SELECT id, cliente_id INTO v_contrato_id, v_cliente_id FROM contratos WHERE id = 'd5c26f18-7e0a-4541-9227-4693fc50f64d';

  -- Registrar evento de montagem concluída
  INSERT INTO contrato_eventos (contrato_id, loja_id, tipo, titulo, descricao, metadata, modulo)
  VALUES (
    v_contrato_id,
    v_loja_id,
    'montagem_concluida',
    'Montagem Finalizada',
    'Simulação de gatilho para teste de NPS.',
    jsonb_build_object('cliente_id', v_cliente_id, 'contrato_id', v_contrato_id),
    'producao' -- Módulo obrigatório
  );
END;
$$ LANGUAGE plpgsql;

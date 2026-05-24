-- Registrar a nova regra de automação para NPS Pós-Montagem
INSERT INTO automacao_regras (id, loja_id, nome, descricao, gatilho, condicoes, acoes, delay_minutos, ativo)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM lojas WHERE nome ILIKE '%Matriz Principal%' LIMIT 1),
  'NPS Pós-Montagem Piloto',
  'Envia pesquisa de satisfação após a conclusão da montagem.',
  'montagem_concluida',
  '{
    "trava_duplicidade_dias": 30,
    "canais_permitidos": ["whatsapp", "email"]
  }'::jsonb,
  '[
    {
      "tipo": "criar_comunicacao_cliente",
      "params": {
        "canal": "whatsapp",
        "tipo": "pesquisa_nps",
        "assunto": "Como foi sua experiência?",
        "mensagem": "Olá! Sua montagem foi concluída. Poderia nos contar o que achou? Acesse o link: {{nps_link}}",
        "template_key": "nps_pos_montagem"
      }
    },
    {
      "tipo": "criar_pesquisa_nps",
      "params": {
        "etapa": "pos_montagem"
      }
    }
  ]'::jsonb,
  0,
  true
);

-- Criar função para simular o gatilho (para teste interno)
CREATE OR REPLACE FUNCTION debug_trigger_nps_pilot() 
RETURNS void AS $$
DECLARE
  v_loja_id UUID;
  v_contrato_id UUID;
  v_cliente_id UUID;
BEGIN
  -- Buscar dados da loja piloto
  SELECT id INTO v_loja_id FROM lojas WHERE nome ILIKE '%Matriz Principal%' LIMIT 1;
  
  -- Buscar o contrato de teste usado anteriormente
  SELECT id, cliente_id INTO v_contrato_id, v_cliente_id FROM contratos WHERE id = 'd5c26f18-7e0a-4541-9227-4693fc50f64d';

  -- Registrar evento de montagem concluída para disparar o motor
  INSERT INTO contrato_eventos (contrato_id, loja_id, tipo, titulo, descricao, metadata)
  VALUES (
    v_contrato_id,
    v_loja_id,
    'montagem_concluida',
    'Montagem Finalizada',
    'Simulação de gatilho para teste de NPS.',
    jsonb_build_object('cliente_id', v_cliente_id, 'contrato_id', v_contrato_id)
  );
END;
$$ LANGUAGE plpgsql;

-- 1. Criar a nova regra de automação para NPS Pós-Pós-Venda (Atendimento Resolvido)
INSERT INTO automacao_regras (id, loja_id, nome, descricao, gatilho, condicoes, acoes, delay_minutos, ativo)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM lojas WHERE nome ILIKE '%Matriz Principal%' LIMIT 1),
  'NPS Pós-Pós-Venda Piloto',
  'Envia pesquisa de satisfação após a resolução de um chamado de pós-venda.',
  'pos_venda_resolvido',
  '{
    "trava_duplicidade_dias": 60,
    "canais_permitidos": ["whatsapp", "email"],
    "ignorar_se_nps_recente": true
  }'::jsonb,
  '[
    {
      "tipo": "criar_comunicacao_cliente",
      "params": {
        "canal": "whatsapp",
        "tipo": "pesquisa_nps",
        "assunto": "Como foi seu atendimento?",
        "mensagem": "Olá! Vimos que seu atendimento de pós-venda foi concluído. Como avalia nossa solução? {{nps_link}}",
        "template_key": "nps_pos_pos_venda"
      }
    },
    {
      "tipo": "criar_pesquisa_nps",
      "params": {
        "etapa": "pos_venda"
      }
    }
  ]'::jsonb,
  0,
  true
);

-- 2. Trigger para disparar o evento de automação quando um chamado é resolvido
-- Importante: Apenas 'resolvido', ignorando 'cancelado' ou 'fechado' sem resolução.
CREATE OR REPLACE FUNCTION public.trg_trigger_nps_pos_venda_resolvido()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para 'resolvido' (ou equivalente conforme o schema)
  IF (NEW.status = 'resolvido' AND OLD.status != 'resolvido') THEN
    INSERT INTO contrato_eventos (contrato_id, loja_id, tipo, titulo, descricao, metadata)
    VALUES (
      NEW.contrato_id,
      NEW.loja_id,
      'pos_venda_resolvido',
      'Atendimento Resolvido',
      'Chamado de pós-venda finalizado com resolução confirmada.',
      jsonb_build_object(
        'chamado_id', NEW.id,
        'cliente_id', (SELECT cliente_id FROM contratos WHERE id = NEW.contrato_id),
        'resolucao', NEW.resolucao -- se houver campo de descrição da resolução
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger na tabela de chamados (ajustando nome da tabela se necessário)
-- Conforme \dt, o nome é 'chamados_pos_venda'
DROP TRIGGER IF EXISTS tgr_nps_pos_venda_resolvido ON public.chamados_pos_venda;
CREATE TRIGGER tgr_nps_pos_venda_resolvido
AFTER UPDATE ON public.chamados_pos_venda
FOR EACH ROW
EXECUTE FUNCTION public.trg_trigger_nps_pos_venda_resolvido();

-- 3. Função de teste para simular o gatilho de Pós-Pós-Venda
CREATE OR REPLACE FUNCTION debug_trigger_nps_pos_venda_pilot() 
RETURNS void AS $$
DECLARE
  v_loja_id UUID;
  v_contrato_id UUID;
  v_cliente_id UUID;
  v_chamado_id UUID;
BEGIN
  -- Buscar dados da loja piloto
  SELECT id INTO v_loja_id FROM lojas WHERE nome ILIKE '%Matriz Principal%' LIMIT 1;
  
  -- Buscar o contrato de teste
  SELECT id, cliente_id INTO v_contrato_id, v_cliente_id FROM contratos WHERE id = 'd5c26f18-7e0a-4541-9227-4693fc50f64d';

  -- Criar um chamado de teste se não existir
  INSERT INTO chamados_pos_venda (loja_id, contrato_id, titulo, descricao, status)
  VALUES (v_loja_id, v_contrato_id, 'Chamado Teste Piloto', 'Teste de automação NPS Pós-Venda', 'pendente')
  RETURNING id INTO v_chamado_id;

  -- Resolver o chamado para disparar o trigger
  UPDATE chamados_pos_venda SET status = 'resolvido' WHERE id = v_chamado_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Registrar alerta de início da fase Pós-Pós-Venda
INSERT INTO communication_alerts (loja_id, canal, tipo, severidade, mensagem)
VALUES (
  (SELECT id FROM lojas WHERE nome ILIKE '%Matriz Principal%' LIMIT 1),
  'sistema',
  'automacao_ativada',
  'info',
  'Automação NPS Pós-Pós-Venda ativada em piloto. Monitorando primeiros disparos.'
);
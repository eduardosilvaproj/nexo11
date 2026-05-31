-- ============================================================
-- NEXO DEMO: Criar usuário de demonstração + dados genéricos
-- Rodar no SQL Editor do Supabase
-- ============================================================
-- LOGIN: demo@nexo.app / Senha: NexoDemo2025!
-- ============================================================

DO $$
DECLARE
  demo_uid UUID;
  demo_loja UUID;
  v_equipe1 UUID;
  v_equipe2 UUID;
  v_forn1 UUID;
  v_forn2 UUID;
  v_forn3 UUID;
  v_contrato1 UUID;
  v_contrato2 UUID;
  v_contrato3 UUID;
  v_contrato4 UUID;
  v_contrato5 UUID;
  v_contrato6 UUID;
  v_contrato7 UUID;
  v_contrato8 UUID;
BEGIN
  -- ========== 1. CRIAR LOJA DEMO ==========
  demo_loja := gen_random_uuid();
  INSERT INTO public.lojas (id, nome, cidade)
  VALUES (demo_loja, 'NEXO Demo Store', 'São Paulo');

  -- ========== 2. CRIAR USUÁRIO AUTH ==========
  SELECT id INTO demo_uid FROM auth.users WHERE email = 'demo@nexo.app';
  IF demo_uid IS NULL THEN
    demo_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token
    ) VALUES (
      demo_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'demo@nexo.app',
      crypt('NexoDemo2025!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome', 'Admin Demo'),
      now(), now(), ''
    );
  END IF;

  -- ========== 3. PERFIL + ROLES ==========
  INSERT INTO public.usuarios (id, loja_id, nome, email)
  VALUES (demo_uid, demo_loja, 'Admin Demo', 'demo@nexo.app')
  ON CONFLICT (id) DO UPDATE SET loja_id = demo_loja, nome = 'Admin Demo';

  INSERT INTO public.user_roles (user_id, role, loja_id) VALUES
    (demo_uid, 'admin', demo_loja),
    (demo_uid, 'franqueador', demo_loja),
    (demo_uid, 'gerente', demo_loja)
  ON CONFLICT DO NOTHING;

  -- ========== 4. EQUIPES ==========
  v_equipe1 := gen_random_uuid();
  v_equipe2 := gen_random_uuid();
  INSERT INTO public.equipes (id, loja_id, nome, cor, ativo) VALUES
    (v_equipe1, demo_loja, 'Equipe Alpha', '#1E6FBF', true),
    (v_equipe2, demo_loja, 'Equipe Beta', '#12B76A', true);

  -- ========== 5. FORNECEDORES ==========
  v_forn1 := gen_random_uuid();
  v_forn2 := gen_random_uuid();
  v_forn3 := gen_random_uuid();
  INSERT INTO public.fornecedores (id, loja_id, nome, ativo) VALUES
    (v_forn1, demo_loja, 'Madeireira São Paulo', true),
    (v_forn2, demo_loja, 'Ferragens Premium', true),
    (v_forn3, demo_loja, 'Vidros & Espelhos Ltda', true);

  -- ========== 6. LEADS ==========
  INSERT INTO public.leads (loja_id, vendedor_id, nome, contato, origem, status, data_entrada) VALUES
    (demo_loja, demo_uid, 'Carlos Mendes', '(11) 99876-5432', 'instagram', 'novo', now() - interval '1 day'),
    (demo_loja, demo_uid, 'Fernanda Lima', '(11) 98765-4321', 'indicacao', 'atendimento', now() - interval '3 days'),
    (demo_loja, demo_uid, 'Roberto Alves', '(11) 97654-3210', 'site', 'visita', now() - interval '5 days'),
    (demo_loja, demo_uid, 'Juliana Costa', '(11) 96543-2109', 'instagram', 'proposta', now() - interval '7 days'),
    (demo_loja, demo_uid, 'Marcos Oliveira', '(11) 95432-1098', 'indicacao', 'convertido', now() - interval '10 days'),
    (demo_loja, demo_uid, 'Patricia Santos', '(11) 94321-0987', 'site', 'novo', now() - interval '2 days'),
    (demo_loja, demo_uid, 'André Souza', '(11) 93210-9876', 'feira', 'atendimento', now() - interval '4 days'),
    (demo_loja, demo_uid, 'Camila Rodrigues', '(11) 92109-8765', 'indicacao', 'proposta', now() - interval '6 days');

  -- ========== 7. CONTRATOS ==========
  v_contrato1 := gen_random_uuid();
  v_contrato2 := gen_random_uuid();
  v_contrato3 := gen_random_uuid();
  v_contrato4 := gen_random_uuid();
  v_contrato5 := gen_random_uuid();
  v_contrato6 := gen_random_uuid();
  v_contrato7 := gen_random_uuid();
  v_contrato8 := gen_random_uuid();

  INSERT INTO public.contratos (id, loja_id, cliente_nome, cliente_contato, vendedor_id, status, valor_venda, assinado, data_criacao) VALUES
    (v_contrato1, demo_loja, 'Maria Silva', '(11) 99111-2233', demo_uid, 'comercial', 45000.00, false, now() - interval '2 days'),
    (v_contrato2, demo_loja, 'João Pereira', '(11) 99222-3344', demo_uid, 'tecnico', 68000.00, true, now() - interval '10 days'),
    (v_contrato3, demo_loja, 'Ana Beatriz', '(11) 99333-4455', demo_uid, 'producao', 92000.00, true, now() - interval '20 days'),
    (v_contrato4, demo_loja, 'Pedro Henrique', '(11) 99444-5566', demo_uid, 'logistica', 55000.00, true, now() - interval '30 days'),
    (v_contrato5, demo_loja, 'Luciana Ferreira', '(11) 99555-6677', demo_uid, 'montagem', 78000.00, true, now() - interval '40 days'),
    (v_contrato6, demo_loja, 'Ricardo Gomes', '(11) 99666-7788', demo_uid, 'pos_venda', 120000.00, true, now() - interval '50 days'),
    (v_contrato7, demo_loja, 'Tatiana Almeida', '(11) 99777-8899', demo_uid, 'finalizado', 85000.00, true, now() - interval '60 days'),
    (v_contrato8, demo_loja, 'Bruno Nascimento', '(11) 99888-9900', demo_uid, 'producao', 62000.00, true, now() - interval '15 days');

  -- ========== 8. DRE CONTRATO ==========
  INSERT INTO public.dre_contrato (contrato_id, valor_venda, custo_produto_previsto, custo_produto_real, custo_montagem_previsto, custo_montagem_real, custo_frete_previsto, custo_frete_real, custo_comissao_previsto, custo_comissao_real, margem_prevista, margem_realizada) VALUES
    (v_contrato1, 45000, 22500, 0, 4500, 0, 1500, 0, 2250, 0, 31.1, 0),
    (v_contrato2, 68000, 34000, 32000, 6800, 0, 2000, 0, 3400, 0, 32.1, 0),
    (v_contrato3, 92000, 46000, 44000, 9200, 8500, 3000, 2800, 4600, 4600, 31.7, 34.9),
    (v_contrato4, 55000, 27500, 26000, 5500, 5200, 1800, 1800, 2750, 2750, 31.7, 34.9),
    (v_contrato5, 78000, 39000, 38000, 7800, 7500, 2500, 2400, 3900, 3900, 31.8, 33.6),
    (v_contrato6, 120000, 60000, 58000, 12000, 11500, 4000, 3800, 6000, 6000, 31.7, 34.0),
    (v_contrato7, 85000, 42500, 41000, 8500, 8200, 2800, 2700, 4250, 4250, 31.7, 33.9),
    (v_contrato8, 62000, 31000, 30000, 6200, 0, 2000, 0, 3100, 0, 31.6, 0)
  ON CONFLICT (contrato_id) DO UPDATE SET
    valor_venda = EXCLUDED.valor_venda,
    custo_produto_previsto = EXCLUDED.custo_produto_previsto,
    custo_produto_real = EXCLUDED.custo_produto_real,
    margem_prevista = EXCLUDED.margem_prevista,
    margem_realizada = EXCLUDED.margem_realizada;

  -- ========== 9. ENTREGAS ==========
  INSERT INTO public.entregas (contrato_id, data_prevista, status, status_visual, turno, responsavel, endereco) VALUES
    (v_contrato4, CURRENT_DATE + 1, 'pendente', 'agendado', 'manha', 'Carlos Motorista', 'Rua das Flores, 123 - Jardim Europa'),
    (v_contrato4, CURRENT_DATE + 2, 'pendente', 'agendado', 'tarde', 'Carlos Motorista', 'Av. Paulista, 1500 - Bela Vista'),
    (v_contrato5, CURRENT_DATE, 'pendente', 'agendado', 'manha', 'Roberto Entregador', 'Rua Augusta, 800 - Consolação'),
    (v_contrato3, CURRENT_DATE + 3, 'pendente', 'a_agendar', 'manha', NULL, 'Rua Oscar Freire, 200 - Pinheiros'),
    (v_contrato6, CURRENT_DATE - 2, 'confirmada', 'entregue', 'manha', 'Carlos Motorista', 'Al. Santos, 500 - Cerqueira César');

  -- ========== 10. AGENDAMENTOS MONTAGEM ==========
  INSERT INTO public.agendamentos_montagem (contrato_id, equipe_id, data, hora_inicio, hora_fim, status) VALUES
    (v_contrato5, v_equipe1, CURRENT_DATE, '08:00', '12:00', 'em_execucao'),
    (v_contrato5, v_equipe1, CURRENT_DATE + 1, '08:00', '17:00', 'agendado'),
    (v_contrato6, v_equipe2, CURRENT_DATE - 5, '08:00', '17:00', 'concluido'),
    (v_contrato6, v_equipe2, CURRENT_DATE - 4, '08:00', '12:00', 'concluido'),
    (v_contrato4, v_equipe1, CURRENT_DATE + 5, '08:00', '17:00', 'agendado'),
    (v_contrato3, v_equipe2, CURRENT_DATE + 7, '13:00', '17:00', 'agendado');

  -- ========== 11. CHAMADOS PÓS-VENDA ==========
  INSERT INTO public.chamados_pos_venda (contrato_id, tipo, status, descricao, created_at) VALUES
    (v_contrato7, 'assistencia', 'aberto', 'Porta do armário desalinhada após 30 dias', now() - interval '2 days'),
    (v_contrato6, 'reclamacao', 'em_andamento', 'Cor do tampo diferente do aprovado', now() - interval '5 days'),
    (v_contrato7, 'garantia', 'resolvido', 'Dobradiça com defeito - substituída', now() - interval '15 days'),
    (v_contrato6, 'solicitacao', 'aberto', 'Cliente quer adicionar prateleira extra', now() - interval '1 day');

  -- ========== 12. PRODUÇÃO TERCEIRIZADA ==========
  INSERT INTO public.producao_terceirizada (loja_id, numero_pedido, contrato_id, status, data_prevista, importado_em) VALUES
    (demo_loja, 'PED-2025-001', v_contrato3, 'em_producao', CURRENT_DATE + 10, now() - interval '15 days'),
    (demo_loja, 'PED-2025-002', v_contrato8, 'aguardando_fabricacao', CURRENT_DATE + 20, now() - interval '5 days'),
    (demo_loja, 'PED-2025-003', v_contrato4, 'pronto_retirada', CURRENT_DATE - 2, now() - interval '25 days'),
    (demo_loja, 'PED-2025-004', v_contrato5, 'em_producao', CURRENT_DATE + 5, now() - interval '20 days');

  -- ========== 13. PRODUÇÃO INTERNA ==========
  INSERT INTO public.producao_interna (loja_id, cliente_nome, fornecedor_id, status, prioridade, data_prevista, descricao) VALUES
    (demo_loja, 'Maria Silva', v_forn2, 'a_fazer', 'normal', CURRENT_DATE + 7, 'Nicho sob medida para banheiro'),
    (demo_loja, 'João Pereira', v_forn3, 'em_andamento', 'urgente', CURRENT_DATE + 3, 'Espelho bisotê para closet'),
    (demo_loja, 'Ana Beatriz', v_forn2, 'aguardando_material', 'normal', CURRENT_DATE + 12, 'Puxadores especiais importados'),
    (demo_loja, 'Pedro Henrique', NULL, 'concluido', 'normal', CURRENT_DATE - 3, 'Recorte para cooktop');

  -- ========== 14. PESSOAS (equipe) ==========
  -- Admin já pode existir via trigger, atualizar
  INSERT INTO public.pessoas (loja_id, nome, funcoes, ativo, auth_user_id, tipo)
  VALUES (demo_loja, 'Admin Demo', ARRAY['admin', 'gerente'], true, demo_uid, 'colaborador')
  ON CONFLICT (auth_user_id) DO UPDATE SET loja_id = demo_loja, nome = 'Admin Demo', funcoes = ARRAY['admin', 'gerente'];

  INSERT INTO public.pessoas (loja_id, nome, funcoes, ativo, tipo) VALUES
    (demo_loja, 'Carlos Silva', ARRAY['vendedor'], true, 'colaborador'),
    (demo_loja, 'Mariana Costa', ARRAY['vendedor'], true, 'colaborador'),
    (demo_loja, 'Roberto Santos', ARRAY['tecnico'], true, 'colaborador'),
    (demo_loja, 'Fernanda Lima', ARRAY['montador'], true, 'colaborador'),
    (demo_loja, 'Lucas Oliveira', ARRAY['montador'], true, 'colaborador'),
    (demo_loja, 'Juliana Ferreira', ARRAY['admin'], true, 'colaborador'),
    (demo_loja, 'André Souza', ARRAY['logistica'], true, 'colaborador');

  RAISE NOTICE '✅ Demo criado com sucesso!';
  RAISE NOTICE '📧 Login: demo@nexo.app';
  RAISE NOTICE '🔑 Senha: NexoDemo2025!';
  RAISE NOTICE '🏪 Loja: NEXO Demo Store (ID: %)', demo_loja;
END $$;

-- Seed de demonstração comercial para o sistema NEXO (Versão Final v6 - UUIDs Dinâmicos)

-- 1. Lojas
INSERT INTO public.lojas (id, nome, cnpj, endereco)
VALUES 
  ('a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', 'NEXO Planejados - Matriz', '12.345.678/0001-90', 'Av. Paulista, 1000, São Paulo - SP'),
  ('b2c3d4e5-f6a7-4b6c-c7d8-e9f0a1b2c3d4', 'NEXO Planejados - Unidade Alphaville', '12.345.678/0002-80', 'Al. Rio Negro, 500, Barueri - SP')
ON CONFLICT (id) DO NOTHING;

-- 2. Clientes
INSERT INTO public.clientes (id, loja_id, nome, email, telefone, endereco)
VALUES 
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', 'Roberto Silva', 'roberto@email.com', '(11) 98888-7777', 'Rua das Flores, 123, Apto 45'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', 'Inovação Tech', 'contato@inovacao.com', '(11) 3333-4444', 'Av. Nações Unidas, 4500, Sala 12'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', 'Dra. Helena Martins', 'helena@email.com', '(11) 99999-0000', 'Rua Oscar Freire, 800')
ON CONFLICT (id) DO NOTHING;

-- 3. Contratos e Transações em Massa (Usando CTE para vincular)
WITH cte_cliente AS (
  SELECT id, nome FROM public.clientes WHERE loja_id = 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3' LIMIT 1
),
ins_contrato AS (
  INSERT INTO public.contratos (id, loja_id, cliente_id, cliente_nome, status, valor_venda, created_at)
  SELECT gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', id, nome, 'comercial', 45000.00, now()
  FROM cte_cliente
  RETURNING id
)
INSERT INTO public.transacoes (id, loja_id, tipo, descricao, categoria, valor, data_vencimento, status, contrato_id)
SELECT gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', 'receita', 'Entrada Contrato Demo', 'Venda', 15000.00, now()::date, 'pago', id
FROM ins_contrato;

-- 4. Itens de Almoxarifado (IDs simplificados para referência em JSON)
INSERT INTO public.estoque_itens (id, loja_id, codigo, descricao, categoria, unidade, quantidade_total, quantidade_reservada, estoque_minimo, ativo)
VALUES 
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', 'PUX-001', 'Puxador Alça Alumínio 160mm', 'Ferragens', 'UN', 150, 0, 50, true),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', 'COR-TS', 'Corrediça Telescópica 450mm', 'Ferragens', 'PAR', 80, 0, 40, true),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', 'DOB-35', 'Dobradiça 35mm com Amortecedor', 'Ferragens', 'UN', 300, 0, 100, true);

-- 5. Outras Transações
INSERT INTO public.transacoes (id, loja_id, tipo, descricao, categoria, valor, data_vencimento, status)
VALUES 
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', 'despesa', 'Aluguel Showroom', 'Custo Fixo', 8500.00, (now() + interval '5 days')::date, 'pendente'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', 'despesa', 'Fornecedor de Chapas MDF', 'Matéria Prima', 12400.00, (now() - interval '2 days')::date, 'pago');

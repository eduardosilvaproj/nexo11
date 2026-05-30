-- ============ financeiro_melhorias.sql ============
-- Adiciona módulos de gestão financeira completa ao NEXO

-- ============ 1. Categorias e Subcategorias de Despesas ============
CREATE TABLE IF NOT EXISTS public.categorias_despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('despesa_fixa', 'despesa_variavel', 'investimento')),
  cor VARCHAR(7) DEFAULT '#6366F1',
  icone VARCHAR(50) DEFAULT 'Wallet',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcategorias_despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.categorias_despesas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.centro_custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('departamento', 'projeto', 'loja', 'marketing', 'operacional')),
  responsavel VARCHAR(200),
  orcamento_mensal DECIMAL(12,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ 2. Solicitacoes de Pagamento (Workflow Aprovação) ============
CREATE TABLE IF NOT EXISTS public.solicitacoes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,
  valor DECIMAL(12,2) NOT NULL,
  beneficiario_nome VARCHAR(200),
  beneficiario_cpf_cnpj VARCHAR(30),
  beneficiario_banco VARCHAR(50),
  beneficiario_agencia VARCHAR(20),
  beneficiario_conta VARCHAR(30),
  beneficiario_pix VARCHAR(200),
  categoria_id UUID REFERENCES public.categorias_despesas(id),
  subcategoria_id UUID REFERENCES public.subcategorias_despesas(id),
  centro_custo_id UUID REFERENCES public.centro_custos(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  conta_bancaria_id UUID,
  data_vencimento DATE,
  data_necessidade DATE,
  status VARCHAR(30) DEFAULT 'pendente' CHECK (status IN (
    'rascunho', 'pendente', 'aprovado_nivel1', 'aprovado_nivel2',
    'rejeitado', 'cancelado', 'pago', 'estornado'
  )),
  nivel_aprovacao INT DEFAULT 1,  -- 1=nível padrão, 2=nível gerência
  valor_aprovado_nivel1 DECIMAL(12,2),
  valor_aprovado_nivel2 DECIMAL(12,2),
  aprovado_por UUID REFERENCES auth.users(id),
  data_aprovacao TIMESTAMPTZ,
  obs_aprovacao TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.solicitacoes_pagamento_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_pagamento(id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(255),
  url TEXT,
  tipo VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.solicitacoes_pagamento_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_pagamento(id) ON DELETE CASCADE,
  acao VARCHAR(50) NOT NULL,
  status_de VARCHAR(30),
  status_para VARCHAR(30),
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ 3. Taxas e Tarifas Bancarias/Financeiras ============
CREATE TABLE IF NOT EXISTS public.taxas_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo_taxa VARCHAR(50) NOT NULL CHECK (tipo_taxa IN (
    'tarifa_bancaria', 'taxa_maquineta', 'taxa_pix', 'taxa_boleto',
    'iof', 'juros_capital', 'multa', 'outro'
  )),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo_aplicacao VARCHAR(20) NOT NULL CHECK (tipo_aplicacao IN ('fixo', 'percentual', 'mixto')),
  valor_fixo DECIMAL(10,2) DEFAULT 0,
  percentual DECIMAL(5,3) DEFAULT 0,  -- ex: 2.5 = 2.5%
  valor_minimo DECIMAL(10,2) DEFAULT 0,
  valor_maximo DECIMAL(10,2),
  prazo_vencimento_dias INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ 4. Cartao de Credito ============
CREATE TABLE IF NOT EXISTS public.cartoes_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome_titular VARCHAR(200) NOT NULL,
  numero_final VARCHAR(4) NOT NULL,
  bandeira VARCHAR(50),
  banco VARCHAR(100),
  limite DECIMAL(12,2) DEFAULT 0,
  limite_utilizado DECIMAL(12,2) DEFAULT 0,
  data_vencimento_fatura INT DEFAULT 1,  -- dia do mês
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'bloqueado', 'cancelado')),
  cor_tag VARCHAR(7) DEFAULT '#10B981',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faturas_cartao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id UUID NOT NULL REFERENCES public.cartoes_credito(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,  -- primeiro dia do mês
  valor_total DECIMAL(12,2) DEFAULT 0,
  valor_aberto DECIMAL(12,2) DEFAULT 0,
  valor_pago DECIMAL(12,2) DEFAULT 0,
  data_vencimento DATE,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'paga', 'parcial')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ 5. Transferências entre empresas/módulos ============
CREATE TABLE IF NOT EXISTS public.transferencias_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  modulo_origem VARCHAR(50) NOT NULL,  -- 'financeiro', 'producao', 'compras'
  modulo_destino VARCHAR(50) NOT NULL,
  descricao TEXT,
  valor DECIMAL(12,2) NOT NULL,
  data_transferencia DATE DEFAULT CURRENT_DATE,
  tipo VARCHAR(30) DEFAULT 'transferencia' CHECK (tipo IN (
    'transferencia', 'repasse', 'deposito', 'saque', 'ajuste'
  )),
  status VARCHAR(20) DEFAULT 'concluida' CHECK (status IN ('rascunho', 'concluida', 'cancelada')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ 6. Campos extras para contas a receber (parcelas) ============
ALTER TABLE public.financeiro_contas_receber
  ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50) DEFAULT 'boleto',
  ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parcela_numero INT,
  ADD COLUMN IF NOT EXISTS total_parcelas INT,
  ADD COLUMN IF NOT EXISTS valor_juros DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_desconto DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS url_boleto TEXT,
  ADD COLUMN IF NOT EXISTS ocorrencia_asaas VARCHAR(100),
  ADD COLUMN IF NOT EXISTS link_pagamento_online TEXT;

-- ============ 7. Campos extras para contas a pagar (parcelas) ============
ALTER TABLE public.financeiro_contas_pagar
  ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parcela_numero INT,
  ADD COLUMN IF NOT EXISTS total_parcelas INT,
  ADD COLUMN IF NOT EXISTS ordem_compra_id UUID,
  ADD COLUMN IF NOT EXISTS solicitacao_pagamento_id UUID REFERENCES public.solicitacoes_pagamento(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor_juros DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_desconto DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES public.cartoes_credito(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS categoria_despesa_id UUID REFERENCES public.categorias_despesas(id),
  ADD COLUMN IF NOT EXISTS subcategoria_id UUID REFERENCES public.subcategorias_despesas(id),
  ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES public.centro_custos(id);

-- ============ RLS Policies ============

-- categorias_despesas
ALTER TABLE public.categorias_despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_despesas_select" ON public.categorias_despesas
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR has_role_on_loja(auth.uid(), current_loja_id(), ARRAY['admin','gerente','financeiro'])
  );
CREATE POLICY "categorias_despesas_manage" ON public.categorias_despesas
  FOR INSERT TO authenticated WITH CHECK (
    has_role_on_loja(auth.uid(), current_loja_id(), ARRAY['admin','gerente'])
  );
CREATE POLICY "categorias_despesas_manage_upd" ON public.categorias_despesas
  FOR UPDATE TO authenticated USING (
    has_role_on_loja(auth.uid(), current_loja_id(), ARRAY['admin','gerente'])
  );
CREATE POLICY "categorias_despesas_manage_del" ON public.categorias_despesas
  FOR DELETE TO authenticated USING (
    has_role_on_loja(auth.uid(), current_loja_id(), ARRAY['admin'])
  );

-- subcategorias_despesas
ALTER TABLE public.subcategorias_despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subcategorias_select" ON public.subcategorias_despesas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "subcategorias_manage" ON public.subcategorias_despesas
  FOR ALL TO authenticated USING (
    has_role_on_loja(auth.uid(), current_loja_id(), ARRAY['admin','gerente'])
  );

-- centro_custos
ALTER TABLE public.centro_custos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "centro_custos_select" ON public.centro_custos
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR has_role_on_loja(auth.uid(), current_loja_id(), ARRAY['admin','gerente','financeiro'])
  );
CREATE POLICY "centro_custos_manage" ON public.centro_custos
  FOR ALL TO authenticated USING (
    has_role_on_loja(auth.uid(), current_loja_id(), ARRAY['admin'])
  );

-- solicitacoes_pagamento
ALTER TABLE public.solicitacoes_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solicitacoes_pagamento_select" ON public.solicitacoes_pagamento
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro'])
    OR created_by = auth.uid()
  );
CREATE POLICY "solicitacoes_pagamento_insert" ON public.solicitacoes_pagamento
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "solicitacoes_pagamento_update" ON public.solicitacoes_pagamento
  FOR UPDATE TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente'])
    OR created_by = auth.uid()
  );
CREATE POLICY "solicitacoes_pagamento_delete" ON public.solicitacoes_pagamento
  FOR DELETE TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'])
    AND status IN ('rascunho', 'rejeitado')
  );

-- solicitacoes_pagamento_anexos
ALTER TABLE public.solicitacoes_pagamento_anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solicitacoes_anexos_all" ON public.solicitacoes_pagamento_anexos
  FOR ALL TO authenticated USING (true);

-- solicitacoes_pagamento_historico
ALTER TABLE public.solicitacoes_pagamento_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solicitacoes_historico_select" ON public.solicitacoes_pagamento_historico
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "solicitacoes_historico_insert" ON public.solicitacoes_pagamento_historico
  FOR INSERT TO authenticated WITH CHECK (true);

-- taxas_financeiras
ALTER TABLE public.taxas_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taxas_financeiras_select" ON public.taxas_financeiras
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR has_role_on_loja(auth.uid(), current_loja_id(), ARRAY['admin','gerente','financeiro'])
  );
CREATE POLICY "taxas_financeiras_manage" ON public.taxas_financeiras
  FOR ALL TO authenticated USING (
    has_role_on_loja(auth.uid(), current_loja_id(), ARRAY['admin'])
  );

-- cartoes_credito
ALTER TABLE public.cartoes_credito ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cartoes_credito_select" ON public.cartoes_credito
  FOR SELECT TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro'])
  );
CREATE POLICY "cartoes_credito_manage" ON public.cartoes_credito
  FOR ALL TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'])
  );

--faturas_cartao
ALTER TABLE public.faturas_cartao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faturas_cartao_select" ON public.faturas_cartao
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "faturas_cartao_manage" ON public.faturas_cartao
  FOR ALL TO authenticated USING (
    has_role_on_loja(auth.uid(), current_loja_id(), ARRAY['admin','gerente','financeiro'])
  );

-- transferencias_modulos
ALTER TABLE public.transferencias_modulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transferencias_select" ON public.transferencias_modulos
  FOR SELECT TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro'])
  );
CREATE POLICY "transferencias_manage" ON public.transferencias_modulos
  FOR ALL TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente'])
  );

-- ============ Sincronizar fornecedores (criar tabela se não existir) ============
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  cpf_cnpj VARCHAR(30),
  email VARCHAR(200),
  telefone VARCHAR(30),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(50),
  cep VARCHAR(20),
  categoria VARCHAR(100),
 observacao TEXT,
  rating DECIMAL(2,1),
  telefone_whatsapp VARCHAR(30),
  site VARCHAR(200),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fornecedores_select" ON public.fornecedores
  FOR SELECT TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro'])
  );
CREATE POLICY "fornecedores_all" ON public.fornecedores
  FOR ALL TO authenticated USING (
    has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente'])
  );
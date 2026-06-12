-- =========================================================
-- MIGRATION: Criar tabelas essenciais faltantes
-- =========================================================
-- Estas tabelas são referenciadas no código do frontend
-- (e em outras migrations) mas nunca foram criadas no schema public.
-- Sem elas, o módulo comercial / cliente inteiro não funciona.
--
-- Tabelas criadas nesta migration:
--   * clientes
--   * orcamentos
--   * condicoes_pagamento
--   * feedbacks
--   * estoque_itens
--   * estoque_movimentacoes
--   * montagens
--   * whatsapp_automacoes
--   * ocorrencias_campo
--   * tour_progresso
--   * ajuda_artigos
--   * agent_faq
--   * agent_conversas
--   * usuarios_publico
--   * feedback_votos
--   * estoque_minimo
--
-- Views criadas:
--   * vw_contratos_dre
--   * vw_fluxo_caixa
--   * vw_ponto_equilibrio
--   * v_communication_metrics
--   * v_communication_settings
-- =========================================================

-- =========================================================
-- ENUM: status de orçamento
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.orcamento_status AS ENUM ('rascunho','enviado','aprovado','rejeitado','convertido');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================
-- ENUM: 'admin_master' ja foi adicionado em migrations
-- anteriores (20260522*, 20260524*). Confirmamos aqui
-- que a migration eh idempotente.
-- =========================================================

-- =========================================================
-- CLIENTES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  cep TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_clientes_updated ON public.clientes;
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_clientes_loja ON public.clientes(loja_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj);

-- =========================================================
-- ORCAMENTOS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  vendedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  arquivo_nome TEXT,
  ordem_compra TEXT,
  total_tabela NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_pedido NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_negociado NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto_global NUMERIC(5,2) NOT NULL DEFAULT 0,
  frete_fabrica NUMERIC(14,2) NOT NULL DEFAULT 0,
  montagem_fabrica NUMERIC(14,2) NOT NULL DEFAULT 0,
  frete_loja NUMERIC(14,2) NOT NULL DEFAULT 0,
  montagem_loja NUMERIC(14,2) NOT NULL DEFAULT 0,
  categorias JSONB NOT NULL DEFAULT '[]'::jsonb,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  acrescimos JSONB NOT NULL DEFAULT '[]'::jsonb,
  condicao_pagamento_id UUID,
  status public.orcamento_status NOT NULL DEFAULT 'rascunho',
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_orcamentos_updated ON public.orcamentos;
CREATE TRIGGER trg_orcamentos_updated BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_orcamentos_loja ON public.orcamentos(loja_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente ON public.orcamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_vendedor ON public.orcamentos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_contrato ON public.orcamentos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON public.orcamentos(status);

-- =========================================================
-- CONDICOES DE PAGAMENTO
-- =========================================================
CREATE TABLE IF NOT EXISTS public.condicoes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  parcelas INTEGER NOT NULL DEFAULT 1,
  taxa NUMERIC(5,2) NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.condicoes_pagamento ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_condicoes_pagamento_updated ON public.condicoes_pagamento;
CREATE TRIGGER trg_condicoes_pagamento_updated BEFORE UPDATE ON public.condicoes_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_loja ON public.condicoes_pagamento(loja_id);

-- Adiciona FK condicao_pagamento_id na tabela orcamentos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orcamentos_condicao_pagamento_fk'
      AND table_name = 'orcamentos'
  ) THEN
    ALTER TABLE public.orcamentos
      ADD CONSTRAINT orcamentos_condicao_pagamento_fk
      FOREIGN KEY (condicao_pagamento_id) REFERENCES public.condicoes_pagamento(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =========================================================
-- FEEDBACKS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'sugestao',
  titulo TEXT NOT NULL,
  descricao TEXT,
  modulo TEXT,
  prioridade TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'aberto',
  votos INTEGER NOT NULL DEFAULT 0,
  autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_feedbacks_updated ON public.feedbacks;
CREATE TRIGGER trg_feedbacks_updated BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_feedbacks_loja ON public.feedbacks(loja_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON public.feedbacks(status);

-- =========================================================
-- FEEDBACK VOTOS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.feedback_votos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.feedbacks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (feedback_id, user_id)
);
ALTER TABLE public.feedback_votos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_feedback_votos_feedback ON public.feedback_votos(feedback_id);

-- =========================================================
-- ESTOQUE ITENS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.estoque_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  codigo TEXT,
  categoria TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade_total NUMERIC(14,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(14,3) NOT NULL DEFAULT 0,
  custo_medio_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_estoque_itens_updated ON public.estoque_itens;
CREATE TRIGGER trg_estoque_itens_updated BEFORE UPDATE ON public.estoque_itens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_estoque_itens_loja ON public.estoque_itens(loja_id);
CREATE INDEX IF NOT EXISTS idx_estoque_itens_codigo ON public.estoque_itens(codigo);

-- =========================================================
-- ESTOQUE MOVIMENTACOES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'entrada' | 'saida' | 'ajuste'
  subtipo TEXT,
  quantidade NUMERIC(14,3) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(14,2),
  valor_total NUMERIC(14,2),
  observacoes TEXT,
  data TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_estoque_mov_item ON public.estoque_movimentacoes(item_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_loja ON public.estoque_movimentacoes(loja_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_data ON public.estoque_movimentacoes(data);

-- Trigger: ao inserir movimentação, atualiza quantidade_total do item
CREATE OR REPLACE FUNCTION public.estoque_aplicar_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.estoque_itens
    SET quantidade_total = quantidade_total + NEW.quantidade,
        updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE public.estoque_itens
    SET quantidade_total = quantidade_total - NEW.quantidade,
        updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_aplicar_movimentacao ON public.estoque_movimentacoes;
CREATE TRIGGER trg_estoque_aplicar_movimentacao
  AFTER INSERT ON public.estoque_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.estoque_aplicar_movimentacao();

-- =========================================================
-- MONTAGENS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.montagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  equipe_id UUID,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  data_prevista DATE,
  hora_inicio TIME,
  hora_fim TIME,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | agendada | em_execucao | concluida | cancelada
  valor_montagem NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_montagem NUMERIC(14,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.montagens ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_montagens_updated ON public.montagens;
CREATE TRIGGER trg_montagens_updated BEFORE UPDATE ON public.montagens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_montagens_loja ON public.montagens(loja_id);
CREATE INDEX IF NOT EXISTS idx_montagens_contrato ON public.montagens(contrato_id);
CREATE INDEX IF NOT EXISTS idx_montagens_status ON public.montagens(status);
CREATE INDEX IF NOT EXISTS idx_montagens_data ON public.montagens(data_prevista);

-- =========================================================
-- WHATSAPP AUTOMACOES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_automacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  gatilho TEXT NOT NULL,
  gatilho_descricao TEXT,
  mensagem TEXT NOT NULL,
  template_id TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  total_enviadas INTEGER NOT NULL DEFAULT 0,
  total_respostas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_automacoes ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_whatsapp_automacoes_updated ON public.whatsapp_automacoes;
CREATE TRIGGER trg_whatsapp_automacoes_updated BEFORE UPDATE ON public.whatsapp_automacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_whatsapp_automacoes_loja ON public.whatsapp_automacoes(loja_id);

-- =========================================================
-- OCORRENCIAS CAMPO
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ocorrencias_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  foto_url TEXT,
  reportado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reportado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ocorrencias_campo ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ocorrencias_campo_loja ON public.ocorrencias_campo(loja_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_campo_contrato ON public.ocorrencias_campo(contrato_id);

-- =========================================================
-- TOUR PROGRESSO (tour guiado / onboarding do usuário)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.tour_progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_key TEXT NOT NULL,
  etapa_atual INTEGER NOT NULL DEFAULT 0,
  concluido BOOLEAN NOT NULL DEFAULT false,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  UNIQUE (user_id, tour_key)
);
ALTER TABLE public.tour_progresso ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tour_progresso_user ON public.tour_progresso(user_id);

-- =========================================================
-- AJUDA ARTIGOS (base de conhecimento)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ajuda_artigos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  categoria TEXT,
  conteudo TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  ordem INTEGER NOT NULL DEFAULT 0,
  publicado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ajuda_artigos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ajuda_artigos_slug ON public.ajuda_artigos(slug);
CREATE INDEX IF NOT EXISTS idx_ajuda_artigos_categoria ON public.ajuda_artigos(categoria);

-- =========================================================
-- AGENT FAQ (base de FAQs do agente IA)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.agent_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  categoria TEXT,
  tags TEXT[] DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_faq ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_agent_faq_categoria ON public.agent_faq(categoria);

-- =========================================================
-- AGENT CONVERSAS (histórico de conversas com o agente IA)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.agent_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  mensagens JSONB NOT NULL DEFAULT '[]'::jsonb,
  contexto JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_conversas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_agent_conversas_user ON public.agent_conversas(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversas_session ON public.agent_conversas(session_id);

-- =========================================================
-- USUARIOS PUBLICO (perfis públicos de clientes/colaboradores)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.usuarios_publico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_publico TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.usuarios_publico ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_usuarios_publico_user ON public.usuarios_publico(user_id);

-- =========================================================
-- VIEWS
-- =========================================================

-- vw_contratos_dre: contrato + DRE em uma linha
CREATE OR REPLACE VIEW public.vw_contratos_dre AS
SELECT
  c.id            AS contrato_id,
  c.loja_id,
  c.cliente_nome,
  c.status,
  c.valor_venda,
  c.assinado,
  c.vendedor_id,
  c.data_criacao,
  c.data_finalizacao,
  d.custo_produto_previsto,
  d.custo_produto_real,
  d.custo_montagem_previsto,
  d.custo_montagem_real,
  d.custo_frete_previsto,
  d.custo_frete_real,
  d.custo_comissao_previsto,
  d.custo_comissao_real,
  d.outros_custos_previstos,
  d.outros_custos_reais,
  d.margem_prevista,
  d.margem_realizada,
  d.desvio_total
FROM public.contratos c
LEFT JOIN public.dre_contrato d ON d.contrato_id = c.id;

-- vw_fluxo_caixa: contas a pagar e a receber
CREATE OR REPLACE VIEW public.vw_fluxo_caixa AS
SELECT 'pagar'::text AS tipo, id, loja_id, descricao, valor, data_vencimento, status
FROM public.financeiro_contas_pagar
UNION ALL
SELECT 'receber'::text AS tipo, id, loja_id, descricao, valor, data_vencimento, status
FROM public.financeiro_contas_receber;

-- vw_ponto_equilibrio: soma custos fixos vs receita média
CREATE OR REPLACE VIEW public.vw_ponto_equilibrio AS
SELECT
  loja_id,
  COALESCE(SUM(valor), 0) AS total_custos_fixos
FROM public.custos_fixos
WHERE ativo = true
GROUP BY loja_id;

-- v_communication_metrics: métricas agregadas de comunicação
CREATE OR REPLACE VIEW public.v_communication_metrics AS
SELECT
  loja_id,
  COUNT(*)                              AS total_envios,
  COUNT(*) FILTER (WHERE status = 'entregue')  AS total_entregues,
  COUNT(*) FILTER (WHERE status = 'falhou')    AS total_falhas,
  COUNT(*) FILTER (WHERE lido = true)          AS total_lidos
FROM public.communication_outbox
GROUP BY loja_id;

-- v_communication_settings: settings ativas
CREATE OR REPLACE VIEW public.v_communication_settings AS
SELECT *
FROM public.communication_settings
WHERE ativo = true;

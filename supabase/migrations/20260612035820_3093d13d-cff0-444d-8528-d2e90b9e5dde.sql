-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.orcamento_status AS ENUM ('rascunho','enviado','aprovado','rejeitado','convertido');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- TABLES
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

CREATE TABLE IF NOT EXISTS public.feedback_votos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.feedbacks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (feedback_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  subtipo TEXT,
  quantidade NUMERIC(14,3) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(14,2),
  valor_total NUMERIC(14,2),
  observacoes TEXT,
  data TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  status TEXT NOT NULL DEFAULT 'pendente',
  valor_montagem NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_montagem NUMERIC(14,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.agent_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  mensagens JSONB NOT NULL DEFAULT '[]'::jsonb,
  contexto JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles_public (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_publico TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.condicoes_pagamento TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedbacks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_votos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_movimentacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.montagens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_automacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocorrencias_campo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_progresso TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ajuda_artigos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_faq TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_conversas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles_public TO authenticated;

GRANT ALL ON public.clientes TO service_role;
GRANT ALL ON public.orcamentos TO service_role;
GRANT ALL ON public.condicoes_pagamento TO service_role;
GRANT ALL ON public.feedbacks TO service_role;
GRANT ALL ON public.feedback_votos TO service_role;
GRANT ALL ON public.estoque_itens TO service_role;
GRANT ALL ON public.estoque_movimentacoes TO service_role;
GRANT ALL ON public.montagens TO service_role;
GRANT ALL ON public.whatsapp_automacoes TO service_role;
GRANT ALL ON public.ocorrencias_campo TO service_role;
GRANT ALL ON public.tour_progresso TO service_role;
GRANT ALL ON public.ajuda_artigos TO service_role;
GRANT ALL ON public.agent_faq TO service_role;
GRANT ALL ON public.agent_conversas TO service_role;
GRANT ALL ON public.profiles_public TO service_role;

-- RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condicoes_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias_campo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_progresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajuda_artigos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_public ENABLE ROW LEVEL SECURITY;

-- Helper and Master Policy
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin_master'
  )
$$;

-- Global Admin Master Policy Pattern
DO $$
DECLARE
    tab text;
BEGIN
    FOR tab IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admin Master Full Access" ON public.%I', tab);
        EXECUTE format('CREATE POLICY "Admin Master Full Access" ON public.%I FOR ALL TO authenticated USING (public.is_admin_master())', tab);
    END LOOP;
END $$;

-- Stock Trigger
CREATE OR REPLACE FUNCTION public.estoque_aplicar_movimentacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.estoque_itens SET quantidade_total = quantidade_total + NEW.quantidade, updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE public.estoque_itens SET quantidade_total = quantidade_total - NEW.quantidade, updated_at = now() WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_estoque_aplicar_movimentacao AFTER INSERT ON public.estoque_movimentacoes FOR EACH ROW EXECUTE FUNCTION public.estoque_aplicar_movimentacao();

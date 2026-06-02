-- ============================================================
-- NEXO: Tabelas para Agentes, Feedback, Ajuda e Tour
-- Rodar no SQL Editor do Supabase
-- ============================================================

-- ========== 1. FEEDBACKS ==========
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('bug', 'sugestao', 'pedido', 'melhoria')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  modulo TEXT,
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'em_analise', 'aprovado', 'em_desenvolvimento', 'concluido', 'rejeitado')),
  screenshot_url TEXT,
  votos INT DEFAULT 0,
  resposta_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedbacks_select" ON public.feedbacks
  FOR SELECT TO authenticated
  USING (loja_id = current_loja_id() OR user_id = auth.uid());

CREATE POLICY "feedbacks_insert" ON public.feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "feedbacks_update" ON public.feedbacks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- ========== 2. FEEDBACK VOTOS ==========
CREATE TABLE IF NOT EXISTS public.feedback_votos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES public.feedbacks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(feedback_id, user_id)
);

ALTER TABLE public.feedback_votos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_votos_select" ON public.feedback_votos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "feedback_votos_insert" ON public.feedback_votos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback_votos_delete" ON public.feedback_votos
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ========== 3. AGENT FAQ ==========
CREATE TABLE IF NOT EXISTS public.agent_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  categoria TEXT,
  keywords TEXT[],
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_faq_select" ON public.agent_faq
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "agent_faq_manage" ON public.agent_faq
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ========== 4. AGENT CONVERSAS ==========
CREATE TABLE IF NOT EXISTS public.agent_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  mensagens JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_conversas_own" ON public.agent_conversas
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ========== 5. AJUDA ARTIGOS ==========
CREATE TABLE IF NOT EXISTS public.ajuda_artigos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  modulo TEXT,
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ajuda_artigos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ajuda_artigos_select" ON public.ajuda_artigos
  FOR SELECT TO authenticated USING (ativo = true);

CREATE POLICY "ajuda_artigos_manage" ON public.ajuda_artigos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ========== 6. TOUR PROGRESSO ==========
CREATE TABLE IF NOT EXISTS public.tour_progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pagina TEXT NOT NULL,
  completado BOOLEAN DEFAULT false,
  step_atual INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pagina)
);

ALTER TABLE public.tour_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tour_progresso_own" ON public.tour_progresso
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ========== 7. SEED FAQ INICIAL ==========
INSERT INTO public.agent_faq (pergunta, resposta, categoria, keywords) VALUES
  ('Como criar um contrato?', 'Vá em Contratos → clique "Novo Contrato". Preencha os dados do cliente, valor e vendedor. Depois clique em Salvar.', 'contratos', ARRAY['contrato', 'criar', 'novo']),
  ('Como registrar um lead?', 'Vá em Comercial → o pipeline de leads aparece. Clique no "+" para adicionar um novo lead com nome, contato e origem.', 'comercial', ARRAY['lead', 'registrar', 'novo']),
  ('Como bater ponto?', 'Acesse o Portal do Funcionário (/portal-funcionario) → aba Ponto → clique no botão grande de Entrada ou Saída.', 'equipe', ARRAY['ponto', 'bater', 'entrada', 'saida']),
  ('Como agendar uma montagem?', 'Vá em Montagem → clique em "Novo Agendamento". Selecione o contrato, equipe, data e horário.', 'montagem', ARRAY['montagem', 'agendar', 'equipe']),
  ('Como ver o DRE de um contrato?', 'Abra o contrato → aba "DRE". Lá mostra custos previstos x realizados e a margem.', 'financeiro', ARRAY['dre', 'margem', 'custo']),
  ('Como cadastrar um fornecedor?', 'Vá em Configurações → Fornecedores → "Novo Fornecedor". Preencha nome, contato e salve.', 'compras', ARRAY['fornecedor', 'cadastrar']),
  ('Como solicitar férias?', 'Portal do Funcionário → aba Solicitações → Nova Solicitação → selecione "Férias" e as datas.', 'rh', ARRAY['ferias', 'solicitar', 'folga']),
  ('Como registrar uma entrega?', 'Vá em Logística → aba Entregas. Encontre o contrato e confirme a entrega com foto.', 'logistica', ARRAY['entrega', 'confirmar', 'logistica']),
  ('Como ver relatórios?', 'Vá em Analytics → Dashboard. Pode personalizar os widgets e exportar PDF.', 'analytics', ARRAY['relatorio', 'analytics', 'dashboard']),
  ('Como reportar um bug?', 'Clique no ícone do assistente (canto inferior direito) ou vá em Feedback → Novo → selecione "Bug".', 'sistema', ARRAY['bug', 'erro', 'reportar'])
ON CONFLICT DO NOTHING;

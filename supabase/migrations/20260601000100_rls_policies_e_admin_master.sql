-- =========================================================
-- MIGRATION: RLS Policies para tabelas criadas
-- + Correcao global: admin_master tem acesso total
-- =========================================================
-- Esta migration:
--  1. Cria policies para todas as tabelas criadas na migration
--     20260601000000_tabelas_essenciais_faltantes.sql
--  2. Adiciona funcao helper is_admin_master()
--  3. Reforca policies existentes para incluir admin_master
--     (que e um papel "platform-level" que precisa ver tudo)
-- =========================================================

-- =========================================================
-- Helper: admin_master (papel de plataforma, loja_id NULL)
-- =========================================================
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

-- =========================================================
-- CLIENTES
-- =========================================================
DROP POLICY IF EXISTS "Clientes visiveis por loja" ON public.clientes;
DROP POLICY IF EXISTS "Vendedor/admin cria clientes na loja" ON public.clientes;
DROP POLICY IF EXISTS "Atualiza clientes da loja" ON public.clientes;
DROP POLICY IF EXISTS "Admin exclui clientes" ON public.clientes;

CREATE POLICY "Clientes visiveis" ON public.clientes
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR public.has_role(auth.uid(), 'franqueador')
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
      OR public.has_role(auth.uid(), 'vendedor')
    ))
  );

CREATE POLICY "Cria clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_master()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
  );

CREATE POLICY "Atualiza clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
      OR public.has_role(auth.uid(), 'vendedor')
    ))
  )
  WITH CHECK (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
      OR public.has_role(auth.uid(), 'vendedor')
    ))
  );

CREATE POLICY "Exclui clientes" ON public.clientes
  FOR DELETE TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
    ))
  );

-- =========================================================
-- ORCAMENTOS
-- =========================================================
DROP POLICY IF EXISTS "Orcamentos visiveis" ON public.orcamentos;
DROP POLICY IF EXISTS "Cria orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Atualiza orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Exclui orcamentos" ON public.orcamentos;

CREATE POLICY "Orcamentos visiveis" ON public.orcamentos
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR public.has_role(auth.uid(), 'franqueador')
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
      OR public.has_role(auth.uid(), 'vendedor')
      OR public.has_role(auth.uid(), 'tecnico')
      OR vendedor_id = auth.uid()
    ))
  );

CREATE POLICY "Cria orcamentos" ON public.orcamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_master()
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Atualiza orcamentos" ON public.orcamentos
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      vendedor_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
    ))
  )
  WITH CHECK (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id())
  );

CREATE POLICY "Exclui orcamentos" ON public.orcamentos
  FOR DELETE TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      vendedor_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
    ))
  );

-- =========================================================
-- CONDICOES DE PAGAMENTO
-- =========================================================
DROP POLICY IF EXISTS "Condicoes visiveis" ON public.condicoes_pagamento;
DROP POLICY IF EXISTS "Gerencia condicoes" ON public.condicoes_pagamento;

CREATE POLICY "Condicoes visiveis" ON public.condicoes_pagamento
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR public.has_role(auth.uid(), 'franqueador')
    OR loja_id = public.current_loja_id()
  );

CREATE POLICY "Gerencia condicoes" ON public.condicoes_pagamento
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
    ))
  )
  WITH CHECK (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
    ))
  );

-- =========================================================
-- FEEDBACKS
-- =========================================================
DROP POLICY IF EXISTS "Feedbacks visiveis" ON public.feedbacks;
DROP POLICY IF EXISTS "Cria feedback" ON public.feedbacks;
DROP POLICY IF EXISTS "Atualiza feedback proprio" ON public.feedbacks;

CREATE POLICY "Feedbacks visiveis" ON public.feedbacks
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR autor_id = auth.uid()
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Cria feedback" ON public.feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() OR public.is_admin_master());

CREATE POLICY "Atualiza feedback" ON public.feedbacks
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_master()
    OR autor_id = auth.uid()
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    public.is_admin_master()
    OR autor_id = auth.uid()
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'))
  );

-- =========================================================
-- FEEDBACK VOTOS
-- =========================================================
DROP POLICY IF EXISTS "Votos visiveis" ON public.feedback_votos;
DROP POLICY IF EXISTS "Vota" ON public.feedback_votos;
DROP POLICY IF EXISTS "Remove voto" ON public.feedback_votos;

CREATE POLICY "Votos visiveis" ON public.feedback_votos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vota" ON public.feedback_votos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Remove voto" ON public.feedback_votos
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- ESTOQUE ITENS
-- =========================================================
DROP POLICY IF EXISTS "Estoque itens visiveis" ON public.estoque_itens;
DROP POLICY IF EXISTS "Gerencia estoque itens" ON public.estoque_itens;

CREATE POLICY "Estoque itens visiveis" ON public.estoque_itens
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR public.has_role(auth.uid(), 'franqueador')
    OR loja_id = public.current_loja_id()
  );

CREATE POLICY "Gerencia estoque itens" ON public.estoque_itens
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
      OR public.has_role(auth.uid(), 'tecnico')
      OR public.has_role(auth.uid(), 'montador')
    ))
  )
  WITH CHECK (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
    ))
  );

-- =========================================================
-- ESTOQUE MOVIMENTACOES
-- =========================================================
DROP POLICY IF EXISTS "Movimentacoes visiveis" ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS "Registra movimentacao" ON public.estoque_movimentacoes;

CREATE POLICY "Movimentacoes visiveis" ON public.estoque_movimentacoes
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR loja_id = public.current_loja_id()
  );

CREATE POLICY "Registra movimentacao" ON public.estoque_movimentacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
      OR public.has_role(auth.uid(), 'tecnico')
      OR public.has_role(auth.uid(), 'montador')
    ))
  );

-- =========================================================
-- MONTAGENS
-- =========================================================
DROP POLICY IF EXISTS "Montagens visiveis" ON public.montagens;
DROP POLICY IF EXISTS "Gerencia montagens" ON public.montagens;

CREATE POLICY "Montagens visiveis" ON public.montagens
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR public.has_role(auth.uid(), 'franqueador')
    OR loja_id = public.current_loja_id()
  );

CREATE POLICY "Gerencia montagens" ON public.montagens
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
      OR public.has_role(auth.uid(), 'tecnico')
      OR public.has_role(auth.uid(), 'montador')
    ))
  )
  WITH CHECK (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
      OR public.has_role(auth.uid(), 'tecnico')
    ))
  );

-- =========================================================
-- WHATSAPP AUTOMACOES
-- =========================================================
DROP POLICY IF EXISTS "Whatsapp automacoes visiveis" ON public.whatsapp_automacoes;
DROP POLICY IF EXISTS "Gerencia whatsapp automacoes" ON public.whatsapp_automacoes;

CREATE POLICY "Whatsapp automacoes visiveis" ON public.whatsapp_automacoes
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR loja_id = public.current_loja_id()
  );

CREATE POLICY "Gerencia whatsapp automacoes" ON public.whatsapp_automacoes
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
    ))
  )
  WITH CHECK (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
    ))
  );

-- =========================================================
-- OCORRENCIAS CAMPO
-- =========================================================
DROP POLICY IF EXISTS "Ocorrencias visiveis" ON public.ocorrencias_campo;
DROP POLICY IF EXISTS "Registra ocorrencia" ON public.ocorrencias_campo;

CREATE POLICY "Ocorrencias visiveis" ON public.ocorrencias_campo
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR loja_id = public.current_loja_id()
  );

CREATE POLICY "Registra ocorrencia" ON public.ocorrencias_campo
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente')
      OR public.has_role(auth.uid(), 'tecnico')
      OR public.has_role(auth.uid(), 'montador')
      OR reportado_por = auth.uid()
    ))
  );

-- =========================================================
-- TOUR PROGRESSO
-- =========================================================
DROP POLICY IF EXISTS "Tour proprio" ON public.tour_progresso;
DROP POLICY IF EXISTS "Atualiza tour proprio" ON public.tour_progresso;
DROP POLICY IF EXISTS "Cria tour proprio" ON public.tour_progresso;

CREATE POLICY "Tour proprio" ON public.tour_progresso
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_master());

CREATE POLICY "Cria tour proprio" ON public.tour_progresso
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin_master());

CREATE POLICY "Atualiza tour proprio" ON public.tour_progresso
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_master())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_master());

-- =========================================================
-- AJUDA ARTIGOS (público para autenticados)
-- =========================================================
DROP POLICY IF EXISTS "Ajuda artigos visiveis" ON public.ajuda_artigos;
CREATE POLICY "Ajuda artigos visiveis" ON public.ajuda_artigos
  FOR SELECT TO authenticated USING (publicado = true OR public.is_admin_master());

-- =========================================================
-- AGENT FAQ
-- =========================================================
DROP POLICY IF EXISTS "FAQ visivel" ON public.agent_faq;
CREATE POLICY "FAQ visivel" ON public.agent_faq
  FOR SELECT TO authenticated USING (ativo = true OR public.is_admin_master());

-- =========================================================
-- AGENT CONVERSAS
-- =========================================================
DROP POLICY IF EXISTS "Conversas proprias" ON public.agent_conversas;
DROP POLICY IF EXISTS "Cria conversa" ON public.agent_conversas;
DROP POLICY IF EXISTS "Atualiza conversa" ON public.agent_conversas;

CREATE POLICY "Conversas proprias" ON public.agent_conversas
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_master());

CREATE POLICY "Cria conversa" ON public.agent_conversas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin_master());

CREATE POLICY "Atualiza conversa" ON public.agent_conversas
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_master())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_master());

-- =========================================================
-- USUARIOS PUBLICO
-- =========================================================
DROP POLICY IF EXISTS "Perfis publicos visiveis" ON public.usuarios_publico;
DROP POLICY IF EXISTS "Edita perfil proprio" ON public.usuarios_publico;
DROP POLICY IF EXISTS "Cria perfil proprio" ON public.usuarios_publico;

CREATE POLICY "Perfis publicos visiveis" ON public.usuarios_publico
  FOR SELECT TO authenticated USING (visible = true OR user_id = auth.uid() OR public.is_admin_master());

CREATE POLICY "Cria perfil proprio" ON public.usuarios_publico
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin_master());

CREATE POLICY "Edita perfil proprio" ON public.usuarios_publico
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_master())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_master());

-- =========================================================
-- REFORCO: policies existentes que NAO incluem admin_master
-- Atualiza leads, contratos, dre_contrato, checklists, OPs,
-- agendamentos e chamados para liberar acesso ao admin_master
-- =========================================================

-- Helper expandido: atualiza todas as policies que filtram por
-- papel para que admin_master sempre passe.
DROP POLICY IF EXISTS "Leads visiveis por loja/papel" ON public.leads;
CREATE POLICY "Leads visiveis por loja/papel" ON public.leads
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR public.has_role(auth.uid(),'franqueador')
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'gerente')
      OR vendedor_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Vendedor cria leads na sua loja" ON public.leads;
CREATE POLICY "Vendedor cria leads na sua loja" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_master() OR loja_id = public.current_loja_id());

DROP POLICY IF EXISTS "Vendedor atualiza proprios leads" ON public.leads;
CREATE POLICY "Vendedor atualiza proprios leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      vendedor_id = auth.uid()
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'gerente')
    ))
  );

DROP POLICY IF EXISTS "Admin/gerente excluem leads" ON public.leads;
CREATE POLICY "Admin/gerente excluem leads" ON public.leads
  FOR DELETE TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')))
  );

DROP POLICY IF EXISTS "Contratos visiveis por loja/papel" ON public.contratos;
CREATE POLICY "Contratos visiveis por loja/papel" ON public.contratos
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR public.has_role(auth.uid(),'franqueador')
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'gerente')
      OR public.has_role(auth.uid(),'tecnico')
      OR public.has_role(auth.uid(),'montador')
      OR vendedor_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Vendedor cria contratos na sua loja" ON public.contratos;
CREATE POLICY "Vendedor cria contratos na sua loja" ON public.contratos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_master() OR loja_id = public.current_loja_id());

DROP POLICY IF EXISTS "Atualiza contratos da loja" ON public.contratos;
CREATE POLICY "Atualiza contratos da loja" ON public.contratos
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'gerente')
      OR public.has_role(auth.uid(),'tecnico')
      OR public.has_role(auth.uid(),'montador')
      OR vendedor_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Admin exclui contratos" ON public.contratos;
CREATE POLICY "Admin exclui contratos" ON public.contratos
  FOR DELETE TO authenticated
  USING (
    public.is_admin_master()
    OR (loja_id = public.current_loja_id() AND public.has_role(auth.uid(),'admin'))
  );

-- DRE_CONTRATO
DROP POLICY IF EXISTS "DRE segue contrato (select)" ON public.dre_contrato;
CREATE POLICY "DRE segue contrato (select)" ON public.dre_contrato
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR EXISTS(SELECT 1 FROM public.contratos c WHERE c.id = dre_contrato.contrato_id)
  );

DROP POLICY IF EXISTS "DRE segue contrato (update)" ON public.dre_contrato;
CREATE POLICY "DRE segue contrato (update)" ON public.dre_contrato
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_master()
    OR EXISTS(SELECT 1 FROM public.contratos c WHERE c.id = dre_contrato.contrato_id AND c.loja_id = public.current_loja_id())
  );

DROP POLICY IF EXISTS "DRE segue contrato (insert)" ON public.dre_contrato;
CREATE POLICY "DRE segue contrato (insert)" ON public.dre_contrato
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_master()
    OR EXISTS(SELECT 1 FROM public.contratos c WHERE c.id = dre_contrato.contrato_id AND c.loja_id = public.current_loja_id())
  );

-- Admin gerencia lojas
DROP POLICY IF EXISTS "Admin gerencia lojas" ON public.lojas;
CREATE POLICY "Admin gerencia lojas" ON public.lojas
  FOR ALL TO authenticated
  USING (public.is_admin_master() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_admin_master() OR public.has_role(auth.uid(),'admin'));

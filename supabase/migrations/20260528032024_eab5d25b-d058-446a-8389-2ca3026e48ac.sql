
-- =========================================================
-- 1) FUNCTIONS / TRIGGER FUNCTIONS → pessoas
-- =========================================================

CREATE OR REPLACE FUNCTION public.current_loja_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.contrato_log_inserir(_contrato_id uuid, _acao text, _titulo text, _descricao text DEFAULT NULL::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _nome text;
BEGIN
  IF _uid IS NOT NULL THEN
    SELECT nome INTO _nome FROM public.pessoas WHERE auth_user_id = _uid LIMIT 1;
  END IF;
  INSERT INTO public.contrato_logs (contrato_id, acao, titulo, descricao, autor_id, autor_nome)
  VALUES (_contrato_id, _acao, _titulo, _descricao, _uid, _nome);
END $$;

CREATE OR REPLACE FUNCTION public.trg_notif_contrato_tecnico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE numero text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'tecnico'::contrato_status AND OLD.status IS DISTINCT FROM NEW.status THEN
    numero := '#' || lpad(substring(NEW.id::text, 1, 4), 4, '0');
    INSERT INTO public.notificacoes (user_id, contrato_id, tipo, mensagem, link)
    SELECT ur.user_id, NEW.id, 'contrato_tecnico',
           format('Contrato %s (%s) aguarda validação técnica', numero, NEW.cliente_nome),
           '/contratos/' || NEW.id
    FROM public.user_roles ur
    JOIN public.pessoas p ON p.auth_user_id = ur.user_id
    WHERE ur.role = 'tecnico'::app_role AND p.loja_id = NEW.loja_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notif_aprovacao_conferencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.aprovacao_solicitada_em IS NOT NULL
     AND OLD.aprovacao_solicitada_em IS DISTINCT FROM NEW.aprovacao_solicitada_em THEN
    INSERT INTO public.notificacoes (user_id, contrato_id, tipo, mensagem, link)
    SELECT ur.user_id, NEW.contrato_id, 'aprovacao_conferencia',
           format('Aprovação solicitada — ambiente "%s" (variação %s%%)', NEW.nome, COALESCE(NEW.variacao_pct, 0)),
           '/contratos/' || NEW.contrato_id
    FROM public.user_roles ur
    JOIN public.pessoas p ON p.auth_user_id = ur.user_id
    WHERE ur.role IN ('admin'::app_role, 'gerente'::app_role) AND p.loja_id = NEW.loja_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.pessoas (id, auth_user_id, nome, email, tipo)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    'colaborador'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.gerar_comissoes_ambiente(_ambiente_id uuid, _gatilho text, _tipos_papel text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _amb record; _contrato record; _total_amb int; _base numeric; _valor numeric;
  _tipo_solicitado text; _usuario_id uuid; _perc numeric;
BEGIN
  SELECT id, contrato_id, loja_id INTO _amb FROM contrato_ambientes WHERE id = _ambiente_id;
  IF _amb.id IS NULL THEN RETURN; END IF;

  SELECT id, valor_venda, status, vendedor_id, projetista_id INTO _contrato
  FROM contratos WHERE id = _amb.contrato_id;
  IF _contrato.id IS NULL OR _contrato.status = 'cancelado' THEN RETURN; END IF;

  SELECT count(*) INTO _total_amb FROM contrato_ambientes WHERE contrato_id = _amb.contrato_id;
  IF _total_amb = 0 THEN RETURN; END IF;

  _base := COALESCE(_contrato.valor_venda, 0) / _total_amb;

  FOREACH _tipo_solicitado IN ARRAY _tipos_papel LOOP
    _usuario_id := NULL; _perc := NULL;

    IF _tipo_solicitado = 'vendedor' THEN
      _usuario_id := _contrato.vendedor_id;
      SELECT COALESCE(CASE WHEN pc.tipo = 'vendedor' THEN u.comissao_percentual ELSE pc.percentual_padrao END, 0) INTO _perc
      FROM pessoas u JOIN papeis_comissao pc ON pc.id = u.papel_comissao_id WHERE u.id = _usuario_id;
      IF _perc IS NULL OR _perc = 0 THEN
        SELECT percentual_padrao INTO _perc FROM papeis_comissao WHERE loja_id = _amb.loja_id AND tipo = 'vendedor' AND ativo = true LIMIT 1;
      END IF;

    ELSIF _tipo_solicitado = 'projetista' THEN
      _usuario_id := _contrato.projetista_id;
      SELECT COALESCE(CASE WHEN pc.tipo = 'projetista' THEN u.comissao_percentual ELSE pc.percentual_padrao END, 0) INTO _perc
      FROM pessoas u JOIN papeis_comissao pc ON pc.id = u.papel_comissao_id WHERE u.id = _usuario_id;
      IF _perc IS NULL OR _perc = 0 THEN
        SELECT percentual_padrao INTO _perc FROM papeis_comissao WHERE loja_id = _amb.loja_id AND tipo = 'projetista' AND ativo = true LIMIT 1;
      END IF;

    ELSIF _tipo_solicitado = 'vendedor_projetista' THEN
      _usuario_id := _contrato.vendedor_id;
      SELECT COALESCE(u.comissao_percentual, pc.percentual_padrao, 0) INTO _perc
      FROM pessoas u JOIN papeis_comissao pc ON pc.id = u.papel_comissao_id WHERE u.id = _usuario_id;

    ELSIF _tipo_solicitado = 'gerente_comercial' THEN
      SELECT u.id, COALESCE(u.comissao_percentual, pc.percentual_padrao, 0) INTO _usuario_id, _perc
      FROM pessoas u JOIN papeis_comissao pc ON pc.id = u.papel_comissao_id
      WHERE u.loja_id = _amb.loja_id AND pc.tipo = 'gerente_comercial' AND pc.ativo = true LIMIT 1;
    END IF;

    IF _usuario_id IS NOT NULL AND COALESCE(_perc, 0) > 0 THEN
      IF EXISTS (
        SELECT 1 FROM comissoes c JOIN papeis_comissao pc ON pc.id = c.papel_id
        WHERE c.ambiente_id = _ambiente_id AND c.usuario_id = _usuario_id AND c.gatilho = _gatilho AND pc.tipo = _tipo_solicitado
      ) THEN CONTINUE; END IF;

      _valor := ROUND(_base * _perc / 100, 2);

      INSERT INTO comissoes (contrato_id, loja_id, ambiente_id, usuario_id, papel_id, base_calculo, percentual, valor, status, gatilho, data_gatilho)
      SELECT _amb.contrato_id, _amb.loja_id, _ambiente_id, _usuario_id, papel_comissao_id,
             _base, _perc, _valor, 'liberada', _gatilho, now()
      FROM pessoas WHERE id = _usuario_id;
    END IF;
  END LOOP;
END $$;

-- =========================================================
-- 2) Drop view usuarios_publico (CASCADE removes 2 contrato_eventos policies)
-- =========================================================
DROP VIEW IF EXISTS public.usuarios_publico CASCADE;

-- =========================================================
-- 3) Drop and recreate all RLS policies referencing usuarios
-- =========================================================

-- anexos_operacionais
DROP POLICY IF EXISTS "Users can create attachments for their store" ON public.anexos_operacionais;
DROP POLICY IF EXISTS "Users can view attachments from their store" ON public.anexos_operacionais;
CREATE POLICY "Users can create attachments for their store" ON public.anexos_operacionais FOR INSERT TO authenticated
  WITH CHECK (loja_id = (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid() LIMIT 1));
CREATE POLICY "Users can view attachments from their store" ON public.anexos_operacionais FOR SELECT TO authenticated
  USING (
    loja_id = (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid() LIMIT 1)
    AND (modulo <> 'financeiro' OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'admin_master'::app_role,'gerente'::app_role,'financeiro'::app_role])))
  );

-- automacao_execucoes
DROP POLICY IF EXISTS "Users can view executions from their store" ON public.automacao_execucoes;
CREATE POLICY "Users can view executions from their store" ON public.automacao_execucoes FOR SELECT TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()) OR has_role(auth.uid(), 'franqueador'::app_role));

-- automacao_regras
DROP POLICY IF EXISTS "Managers can manage rules from their store" ON public.automacao_regras;
DROP POLICY IF EXISTS "Users can view rules from their store" ON public.automacao_regras;
CREATE POLICY "Managers can manage rules from their store" ON public.automacao_regras FOR ALL TO authenticated
  USING ((loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gerente'::app_role))) OR has_role(auth.uid(),'franqueador'::app_role))
  WITH CHECK ((loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gerente'::app_role))) OR has_role(auth.uid(),'franqueador'::app_role));
CREATE POLICY "Users can view rules from their store" ON public.automacao_regras FOR SELECT TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()) OR has_role(auth.uid(),'franqueador'::app_role));

-- cliente_comunicacoes
DROP POLICY IF EXISTS "Comunicações visíveis por loja" ON public.cliente_comunicacoes;
CREATE POLICY "Comunicações visíveis por loja" ON public.cliente_comunicacoes FOR SELECT TO authenticated
  USING (
    (contrato_id IS NOT NULL AND contrato_da_loja(contrato_id))
    OR loja_id IN (SELECT p.loja_id FROM public.pessoas p WHERE p.auth_user_id = auth.uid())
    OR has_role(auth.uid(),'franqueador'::app_role)
  );

-- cliente_pesquisas
DROP POLICY IF EXISTS "Pesquisas visíveis por loja e papel" ON public.cliente_pesquisas;
CREATE POLICY "Pesquisas visíveis por loja e papel" ON public.cliente_pesquisas FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'franqueador'::app_role) OR loja_id IN (SELECT p.loja_id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()));

-- cliente_preferencias_comunicacao
DROP POLICY IF EXISTS "Manage preferences by store staff" ON public.cliente_preferencias_comunicacao;
DROP POLICY IF EXISTS "View preferences by store" ON public.cliente_preferencias_comunicacao;
CREATE POLICY "Manage preferences by store staff" ON public.cliente_preferencias_comunicacao FOR ALL TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()) OR has_role(auth.uid(),'franqueador'::app_role))
  WITH CHECK (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()) OR has_role(auth.uid(),'franqueador'::app_role));
CREATE POLICY "View preferences by store" ON public.cliente_preferencias_comunicacao FOR SELECT TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()) OR has_role(auth.uid(),'franqueador'::app_role));

-- communication_alerts
DROP POLICY IF EXISTS "View alerts by store" ON public.communication_alerts;
CREATE POLICY "View alerts by store" ON public.communication_alerts FOR SELECT TO authenticated
  USING (loja_id IN (SELECT p.loja_id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()) OR has_role(auth.uid(),'franqueador'::app_role));

-- communication_outbox
DROP POLICY IF EXISTS "Insert into outbox by authorized staff" ON public.communication_outbox;
DROP POLICY IF EXISTS "Manage outbox by store managers" ON public.communication_outbox;
DROP POLICY IF EXISTS "View outbox by store" ON public.communication_outbox;
CREATE POLICY "Insert into outbox by authorized staff" ON public.communication_outbox FOR INSERT TO authenticated
  WITH CHECK (loja_id IN (SELECT p.loja_id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()) OR has_role(auth.uid(),'franqueador'::app_role));
CREATE POLICY "Manage outbox by store managers" ON public.communication_outbox FOR ALL TO authenticated
  USING ((loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gerente'::app_role))) OR has_role(auth.uid(),'franqueador'::app_role))
  WITH CHECK ((loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gerente'::app_role))) OR has_role(auth.uid(),'franqueador'::app_role));
CREATE POLICY "View outbox by store" ON public.communication_outbox FOR SELECT TO authenticated
  USING ((loja_id IN (SELECT p.loja_id FROM public.pessoas p WHERE p.auth_user_id = auth.uid())
          AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gerente'::app_role) OR has_role(auth.uid(),'franqueador'::app_role) OR has_role(auth.uid(),'pos_venda'::app_role) OR has_role(auth.uid(),'vendedor'::app_role)))
          OR has_role(auth.uid(),'franqueador'::app_role));

-- communication_settings
DROP POLICY IF EXISTS "Manage settings by store managers" ON public.communication_settings;
DROP POLICY IF EXISTS "View settings by store" ON public.communication_settings;
CREATE POLICY "Manage settings by store managers" ON public.communication_settings FOR ALL TO authenticated
  USING ((loja_id IN (SELECT p.loja_id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gerente'::app_role))) OR has_role(auth.uid(),'franqueador'::app_role))
  WITH CHECK ((loja_id IN (SELECT p.loja_id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gerente'::app_role))) OR has_role(auth.uid(),'franqueador'::app_role));
CREATE POLICY "View settings by store" ON public.communication_settings FOR SELECT TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()) OR has_role(auth.uid(),'franqueador'::app_role));

-- contrato_eventos (policies were dropped by CASCADE above)
CREATE POLICY "Users can view events from their store" ON public.contrato_eventos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pessoas p WHERE p.auth_user_id = auth.uid() AND p.loja_id = contrato_eventos.loja_id));
CREATE POLICY "System/Users can insert events for their store" ON public.contrato_eventos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM contratos c JOIN public.pessoas p ON p.auth_user_id = auth.uid()
    WHERE c.id = contrato_eventos.contrato_id AND c.loja_id = p.loja_id
  ));

-- documento_aceites
DROP POLICY IF EXISTS "Users can create approvals for their store" ON public.documento_aceites;
DROP POLICY IF EXISTS "Users can view approvals from their store" ON public.documento_aceites;
CREATE POLICY "Users can create approvals for their store" ON public.documento_aceites FOR INSERT TO authenticated
  WITH CHECK (loja_id = (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid() LIMIT 1));
CREATE POLICY "Users can view approvals from their store" ON public.documento_aceites FOR SELECT TO authenticated
  USING (loja_id = (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid() LIMIT 1));

-- financeiro_contas_pagar
DROP POLICY IF EXISTS "Users can manage their store's payables" ON public.financeiro_contas_pagar;
DROP POLICY IF EXISTS "Users can view their store's payables" ON public.financeiro_contas_pagar;
CREATE POLICY "Users can manage their store's payables" ON public.financeiro_contas_pagar FOR ALL TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()))
  WITH CHECK (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can view their store's payables" ON public.financeiro_contas_pagar FOR SELECT TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()));

-- financeiro_contas_receber
DROP POLICY IF EXISTS "Users can manage their store's receivables" ON public.financeiro_contas_receber;
DROP POLICY IF EXISTS "Users can view their store's receivables" ON public.financeiro_contas_receber;
CREATE POLICY "Users can manage their store's receivables" ON public.financeiro_contas_receber FOR ALL TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()))
  WITH CHECK (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can view their store's receivables" ON public.financeiro_contas_receber FOR SELECT TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid()));

-- notificacoes
DROP POLICY IF EXISTS "Usuários podem marcar suas notificações como lidas" ON public.notificacoes;
DROP POLICY IF EXISTS "Usuários veem notificações da própria loja" ON public.notificacoes;
CREATE POLICY "Usuários podem marcar suas notificações como lidas" ON public.notificacoes FOR UPDATE TO authenticated
  USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
    AND (
      usuario_id = auth.uid()
      OR perfil_destino IN (SELECT (user_roles.role)::text FROM user_roles WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role)::text = ANY (ARRAY['admin','admin_master','gerente','franqueador']))
    )
  );
CREATE POLICY "Usuários veem notificações da própria loja" ON public.notificacoes FOR SELECT TO authenticated
  USING (
    loja_id IN (SELECT loja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
    AND (
      usuario_id = auth.uid()
      OR perfil_destino IN (SELECT (user_roles.role)::text FROM user_roles WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role)::text = ANY (ARRAY['admin','admin_master','gerente','franqueador']))
    )
  );

-- usuario_lojas
DROP POLICY IF EXISTS "Admins e Gerentes podem gerenciar relacionamentos" ON public.usuario_lojas;
DROP POLICY IF EXISTS "Admins e Gerentes podem ver todos os relacionamentos" ON public.usuario_lojas;
CREATE POLICY "Admins e Gerentes podem gerenciar relacionamentos" ON public.usuario_lojas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pessoas p WHERE p.auth_user_id = auth.uid() AND (p.funcoes @> ARRAY['admin'::text] OR p.funcoes @> ARRAY['gerente'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pessoas p WHERE p.auth_user_id = auth.uid() AND (p.funcoes @> ARRAY['admin'::text] OR p.funcoes @> ARRAY['gerente'::text])));
CREATE POLICY "Admins e Gerentes podem ver todos os relacionamentos" ON public.usuario_lojas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pessoas p WHERE p.auth_user_id = auth.uid() AND (p.funcoes @> ARRAY['admin'::text] OR p.funcoes @> ARRAY['gerente'::text])));

-- =========================================================
-- 4) Redirect FKs from usuarios → pessoas
-- =========================================================
ALTER TABLE public.orcamentos       DROP CONSTRAINT IF EXISTS orcamentos_vendedor_id_fkey;
ALTER TABLE public.orcamentos       DROP CONSTRAINT IF EXISTS orcamentos_projetista_id_fkey;
ALTER TABLE public.contratos        DROP CONSTRAINT IF EXISTS contratos_projetista_id_fkey;
ALTER TABLE public.usuario_lojas    DROP CONSTRAINT IF EXISTS usuario_lojas_usuario_id_fkey;
ALTER TABLE public.rh_funcionarios  DROP CONSTRAINT IF EXISTS rh_funcionarios_usuario_id_fkey;

ALTER TABLE public.orcamentos       ADD CONSTRAINT orcamentos_vendedor_id_fkey      FOREIGN KEY (vendedor_id)   REFERENCES public.pessoas(id) ON DELETE SET NULL;
ALTER TABLE public.orcamentos       ADD CONSTRAINT orcamentos_projetista_id_fkey   FOREIGN KEY (projetista_id) REFERENCES public.pessoas(id) ON DELETE SET NULL;
ALTER TABLE public.contratos        ADD CONSTRAINT contratos_projetista_id_fkey    FOREIGN KEY (projetista_id) REFERENCES public.pessoas(id) ON DELETE SET NULL;
ALTER TABLE public.usuario_lojas    ADD CONSTRAINT usuario_lojas_usuario_id_fkey   FOREIGN KEY (usuario_id)    REFERENCES public.pessoas(id) ON DELETE CASCADE;
ALTER TABLE public.rh_funcionarios  ADD CONSTRAINT rh_funcionarios_usuario_id_fkey FOREIGN KEY (usuario_id)    REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- =========================================================
-- 5) Drop the usuarios table and replace it with a compat VIEW over pessoas
-- =========================================================
DROP TABLE IF EXISTS public.usuarios CASCADE;

CREATE VIEW public.usuarios AS
SELECT
  p.id,
  p.loja_id,
  p.nome,
  p.email,
  p.created_at,
  p.updated_at,
  p.papel_comissao_id,
  p.comissao_percentual,
  p.funcoes,
  p.funcoes_app_habilitadas
FROM public.pessoas p
WHERE p.auth_user_id IS NOT NULL;

GRANT SELECT ON public.usuarios TO authenticated;
GRANT SELECT ON public.usuarios TO anon;
GRANT ALL    ON public.usuarios TO service_role;

-- =========================================================
-- 6) Recreate usuarios_publico view
-- =========================================================
CREATE VIEW public.usuarios_publico AS
SELECT
  p.id,
  p.nome,
  p.loja_id,
  p.created_at,
  p.updated_at,
  p.email,
  p.auth_user_id,
  p.ativo
FROM public.pessoas p
WHERE p.auth_user_id IS NOT NULL;

GRANT SELECT ON public.usuarios_publico TO authenticated;
GRANT SELECT ON public.usuarios_publico TO anon;
GRANT ALL    ON public.usuarios_publico TO service_role;

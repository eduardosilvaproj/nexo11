
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin','vendedor','tecnico','montador','gerente','franqueador');
CREATE TYPE public.contrato_status AS ENUM ('comercial','tecnico','producao','logistica','montagem','pos_venda','finalizado');
CREATE TYPE public.lead_status AS ENUM ('novo','atendimento','visita','proposta','convertido','perdido');
CREATE TYPE public.op_status AS ENUM ('aguardando','em_corte','em_montagem','concluido');
CREATE TYPE public.chamado_status AS ENUM ('aberto','em_andamento','resolvido');
CREATE TYPE public.chamado_tipo AS ENUM ('assistencia','reclamacao','garantia','solicitacao');
CREATE TYPE public.agendamento_status AS ENUM ('agendado','em_execucao','concluido','cancelado');

-- =========================================================
-- UPDATED_AT helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- LOJAS
-- =========================================================
CREATE TABLE public.lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cidade TEXT,
  franqueado_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_lojas_updated BEFORE UPDATE ON public.lojas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- USUARIOS (perfil ligado ao auth.users)
-- =========================================================
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- USER ROLES (papéis por loja)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, loja_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role: checa papel global ou em loja específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role, _loja_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_loja_id IS NULL OR loja_id = _loja_id OR loja_id IS NULL)
  )
$$;

CREATE OR REPLACE FUNCTION public.current_loja_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT loja_id FROM public.usuarios WHERE id = auth.uid()
$$;

-- =========================================================
-- LEADS
-- =========================================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  vendedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  contato TEXT,
  origem TEXT,
  status public.lead_status NOT NULL DEFAULT 'novo',
  data_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_ultimo_contato TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_leads_loja ON public.leads(loja_id);
CREATE INDEX idx_leads_vendedor ON public.leads(vendedor_id);

-- =========================================================
-- CONTRATOS
-- =========================================================
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  cliente_contato TEXT,
  vendedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.contrato_status NOT NULL DEFAULT 'comercial',
  valor_venda NUMERIC(14,2) NOT NULL DEFAULT 0,
  assinado BOOLEAN NOT NULL DEFAULT false,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_finalizacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_contratos_updated BEFORE UPDATE ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_contratos_loja ON public.contratos(loja_id);
CREATE INDEX idx_contratos_vendedor ON public.contratos(vendedor_id);
CREATE INDEX idx_contratos_status ON public.contratos(status);

-- =========================================================
-- DRE CONTRATO
-- =========================================================
CREATE TABLE public.dre_contrato (
  contrato_id UUID PRIMARY KEY REFERENCES public.contratos(id) ON DELETE CASCADE,
  valor_venda NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_produto_previsto NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_produto_real NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_montagem_previsto NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_montagem_real NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_frete_previsto NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_frete_real NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_comissao_previsto NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_comissao_real NUMERIC(14,2) NOT NULL DEFAULT 0,
  outros_custos_previstos NUMERIC(14,2) NOT NULL DEFAULT 0,
  outros_custos_reais NUMERIC(14,2) NOT NULL DEFAULT 0,
  margem_prevista NUMERIC(7,2) NOT NULL DEFAULT 0,
  margem_realizada NUMERIC(7,2) NOT NULL DEFAULT 0,
  desvio_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dre_contrato ENABLE ROW LEVEL SECURITY;

-- Recalcula margens e desvio
CREATE OR REPLACE FUNCTION public.dre_recalcular()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_prev NUMERIC(14,2);
  total_real NUMERIC(14,2);
BEGIN
  total_prev := COALESCE(NEW.custo_produto_previsto,0) + COALESCE(NEW.custo_montagem_previsto,0)
              + COALESCE(NEW.custo_frete_previsto,0) + COALESCE(NEW.custo_comissao_previsto,0)
              + COALESCE(NEW.outros_custos_previstos,0);
  total_real := COALESCE(NEW.custo_produto_real,0) + COALESCE(NEW.custo_montagem_real,0)
              + COALESCE(NEW.custo_frete_real,0) + COALESCE(NEW.custo_comissao_real,0)
              + COALESCE(NEW.outros_custos_reais,0);

  IF NEW.valor_venda > 0 THEN
    NEW.margem_prevista := ROUND(((NEW.valor_venda - total_prev) / NEW.valor_venda) * 100, 2);
    NEW.margem_realizada := ROUND(((NEW.valor_venda - total_real) / NEW.valor_venda) * 100, 2);
  ELSE
    NEW.margem_prevista := 0;
    NEW.margem_realizada := 0;
  END IF;

  NEW.desvio_total := total_real - total_prev;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dre_recalcular
BEFORE INSERT OR UPDATE ON public.dre_contrato
FOR EACH ROW EXECUTE FUNCTION public.dre_recalcular();

-- Cria DRE automaticamente ao criar contrato e mantém valor_venda sincronizado
CREATE OR REPLACE FUNCTION public.contrato_sync_dre()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dre_contrato (contrato_id, valor_venda)
    VALUES (NEW.id, NEW.valor_venda);
  ELSIF TG_OP = 'UPDATE' AND NEW.valor_venda IS DISTINCT FROM OLD.valor_venda THEN
    UPDATE public.dre_contrato SET valor_venda = NEW.valor_venda WHERE contrato_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contrato_sync_dre
AFTER INSERT OR UPDATE OF valor_venda ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.contrato_sync_dre();

-- =========================================================
-- CHECKLISTS TÉCNICOS
-- =========================================================
CREATE TABLE public.checklists_tecnicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  responsavel UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  observacao TEXT,
  data TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklists_tecnicos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_checklists_updated BEFORE UPDATE ON public.checklists_tecnicos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_checklists_contrato ON public.checklists_tecnicos(contrato_id);

-- =========================================================
-- ORDENS DE PRODUÇÃO
-- =========================================================
CREATE TABLE public.ordens_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  status public.op_status NOT NULL DEFAULT 'aguardando',
  data_inicio TIMESTAMPTZ,
  data_previsao TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  itens_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  custo_real NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ordens_producao ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_op_updated BEFORE UPDATE ON public.ordens_producao
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_op_contrato ON public.ordens_producao(contrato_id);

-- =========================================================
-- AGENDAMENTOS DE MONTAGEM
-- =========================================================
CREATE TABLE public.agendamentos_montagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  equipe_id UUID,
  data DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  checklist_obra_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.agendamento_status NOT NULL DEFAULT 'agendado',
  retrabalho BOOLEAN NOT NULL DEFAULT false,
  retrabalho_motivo TEXT,
  entrega_confirmada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agendamentos_montagem ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_agend_updated BEFORE UPDATE ON public.agendamentos_montagem
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_agend_contrato ON public.agendamentos_montagem(contrato_id);

-- =========================================================
-- CHAMADOS PÓS-VENDA
-- =========================================================
CREATE TABLE public.chamados_pos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  tipo public.chamado_tipo NOT NULL,
  descricao TEXT NOT NULL,
  status public.chamado_status NOT NULL DEFAULT 'aberto',
  nps INTEGER CHECK (nps IS NULL OR (nps BETWEEN 1 AND 10)),
  nps_comentario TEXT,
  data_abertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fechamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chamados_pos_venda ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_chamados_updated BEFORE UPDATE ON public.chamados_pos_venda
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_chamados_contrato ON public.chamados_pos_venda(contrato_id);

-- =========================================================
-- TRAVAS DE TRANSIÇÃO DE STATUS DO CONTRATO
-- =========================================================
CREATE OR REPLACE FUNCTION public.contrato_travas_etapa()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_check INT;
  pendentes INT;
  op_ok BOOLEAN;
  agend_ok BOOLEAN;
  retrab_pendente BOOLEAN;
  chamados_abertos INT;
  nps_ok BOOLEAN;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Comercial -> Tecnico
  IF OLD.status = 'comercial' AND NEW.status = 'tecnico' THEN
    IF NEW.assinado IS NOT TRUE OR NEW.valor_venda <= 0 THEN
      RAISE EXCEPTION 'TRAVA_COMERCIAL: contrato precisa estar assinado e ter valor_venda > 0' USING ERRCODE = '22023';
    END IF;

  -- Tecnico -> Producao
  ELSIF OLD.status = 'tecnico' AND NEW.status = 'producao' THEN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE NOT concluido)
      INTO total_check, pendentes
      FROM public.checklists_tecnicos WHERE contrato_id = NEW.id;
    IF total_check = 0 OR pendentes > 0 THEN
      RAISE EXCEPTION 'TRAVA_TECNICO: checklist técnico deve estar 100%% concluído' USING ERRCODE = '22023';
    END IF;

  -- Producao -> Logistica
  ELSIF OLD.status = 'producao' AND NEW.status = 'logistica' THEN
    SELECT EXISTS(SELECT 1 FROM public.ordens_producao WHERE contrato_id = NEW.id AND status = 'concluido')
      INTO op_ok;
    IF NOT op_ok THEN
      RAISE EXCEPTION 'TRAVA_PRODUCAO: ordem de produção deve estar concluída' USING ERRCODE = '22023';
    END IF;

  -- Logistica -> Montagem
  ELSIF OLD.status = 'logistica' AND NEW.status = 'montagem' THEN
    SELECT EXISTS(SELECT 1 FROM public.agendamentos_montagem WHERE contrato_id = NEW.id AND entrega_confirmada = true)
      INTO agend_ok;
    IF NOT agend_ok THEN
      RAISE EXCEPTION 'TRAVA_LOGISTICA: agendamento criado e entrega confirmada são obrigatórios' USING ERRCODE = '22023';
    END IF;

  -- Montagem -> Pos venda
  ELSIF OLD.status = 'montagem' AND NEW.status = 'pos_venda' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.agendamentos_montagem
      WHERE contrato_id = NEW.id AND retrabalho = true AND status <> 'concluido'
    ) INTO retrab_pendente;
    IF retrab_pendente THEN
      RAISE EXCEPTION 'TRAVA_MONTAGEM: existe retrabalho pendente' USING ERRCODE = '22023';
    END IF;

  -- Pos venda -> Finalizado
  ELSIF OLD.status = 'pos_venda' AND NEW.status = 'finalizado' THEN
    SELECT COUNT(*) INTO chamados_abertos
      FROM public.chamados_pos_venda
      WHERE contrato_id = NEW.id AND status <> 'resolvido';
    SELECT EXISTS(SELECT 1 FROM public.chamados_pos_venda WHERE contrato_id = NEW.id AND nps IS NOT NULL)
      INTO nps_ok;
    IF chamados_abertos > 0 OR NOT nps_ok THEN
      RAISE EXCEPTION 'TRAVA_POSVENDA: todos os chamados devem estar resolvidos e o NPS registrado' USING ERRCODE = '22023';
    END IF;
    NEW.data_finalizacao := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contrato_travas
BEFORE UPDATE OF status ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.contrato_travas_etapa();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- LOJAS
CREATE POLICY "Franqueador vê todas as lojas" ON public.lojas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'franqueador') OR id = public.current_loja_id());
CREATE POLICY "Admin gerencia lojas" ON public.lojas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- USUARIOS
CREATE POLICY "Vê próprios dados ou da loja" ON public.usuarios
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR loja_id = public.current_loja_id()
    OR public.has_role(auth.uid(),'franqueador')
  );
CREATE POLICY "Usuário atualiza o próprio perfil" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
CREATE POLICY "Admin gerencia usuários da loja" ON public.usuarios
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'));

-- USER_ROLES
CREATE POLICY "Vê próprios papéis" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia papéis" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- LEADS
CREATE POLICY "Leads visíveis por loja/papel" ON public.leads
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'franqueador')
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'gerente')
      OR vendedor_id = auth.uid()
    ))
  );
CREATE POLICY "Vendedor cria leads na sua loja" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (loja_id = public.current_loja_id());
CREATE POLICY "Vendedor atualiza próprios leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    loja_id = public.current_loja_id() AND (
      vendedor_id = auth.uid()
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'gerente')
    )
  );
CREATE POLICY "Admin/gerente excluem leads" ON public.leads
  FOR DELETE TO authenticated
  USING (loja_id = public.current_loja_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')));

-- CONTRATOS
CREATE POLICY "Contratos visíveis por loja/papel" ON public.contratos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'franqueador')
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'gerente')
      OR public.has_role(auth.uid(),'tecnico')
      OR public.has_role(auth.uid(),'montador')
      OR vendedor_id = auth.uid()
    ))
  );
CREATE POLICY "Vendedor cria contratos na sua loja" ON public.contratos
  FOR INSERT TO authenticated
  WITH CHECK (loja_id = public.current_loja_id());
CREATE POLICY "Atualiza contratos da loja" ON public.contratos
  FOR UPDATE TO authenticated
  USING (
    loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'gerente')
      OR public.has_role(auth.uid(),'tecnico')
      OR public.has_role(auth.uid(),'montador')
      OR vendedor_id = auth.uid()
    )
  );
CREATE POLICY "Admin exclui contratos" ON public.contratos
  FOR DELETE TO authenticated
  USING (loja_id = public.current_loja_id() AND public.has_role(auth.uid(),'admin'));

-- DRE_CONTRATO (segue contrato)
CREATE POLICY "DRE segue contrato (select)" ON public.dre_contrato
  FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.contratos c WHERE c.id = dre_contrato.contrato_id));
CREATE POLICY "DRE segue contrato (update)" ON public.dre_contrato
  FOR UPDATE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.contratos c WHERE c.id = dre_contrato.contrato_id AND c.loja_id = public.current_loja_id()));
CREATE POLICY "DRE segue contrato (insert)" ON public.dre_contrato
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.contratos c WHERE c.id = dre_contrato.contrato_id AND c.loja_id = public.current_loja_id()));

-- Helper para policies por contrato
CREATE OR REPLACE FUNCTION public.contrato_da_loja(_contrato_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.contratos c WHERE c.id = _contrato_id AND c.loja_id = public.current_loja_id())
$$;

-- CHECKLISTS
CREATE POLICY "Checklists visíveis por contrato" ON public.checklists_tecnicos
  FOR SELECT TO authenticated USING (public.contrato_da_loja(contrato_id) OR public.has_role(auth.uid(),'franqueador'));
CREATE POLICY "Checklists gerenciados pela loja" ON public.checklists_tecnicos
  FOR ALL TO authenticated USING (public.contrato_da_loja(contrato_id)) WITH CHECK (public.contrato_da_loja(contrato_id));

-- ORDENS PRODUÇÃO
CREATE POLICY "OPs visíveis por contrato" ON public.ordens_producao
  FOR SELECT TO authenticated USING (public.contrato_da_loja(contrato_id) OR public.has_role(auth.uid(),'franqueador'));
CREATE POLICY "OPs gerenciadas pela loja" ON public.ordens_producao
  FOR ALL TO authenticated USING (public.contrato_da_loja(contrato_id)) WITH CHECK (public.contrato_da_loja(contrato_id));

-- AGENDAMENTOS
CREATE POLICY "Agendamentos visíveis por contrato" ON public.agendamentos_montagem
  FOR SELECT TO authenticated USING (public.contrato_da_loja(contrato_id) OR public.has_role(auth.uid(),'franqueador'));
CREATE POLICY "Agendamentos gerenciados pela loja" ON public.agendamentos_montagem
  FOR ALL TO authenticated USING (public.contrato_da_loja(contrato_id)) WITH CHECK (public.contrato_da_loja(contrato_id));

-- CHAMADOS
CREATE POLICY "Chamados visíveis por contrato" ON public.chamados_pos_venda
  FOR SELECT TO authenticated USING (public.contrato_da_loja(contrato_id) OR public.has_role(auth.uid(),'franqueador'));
CREATE POLICY "Chamados gerenciados pela loja" ON public.chamados_pos_venda
  FOR ALL TO authenticated USING (public.contrato_da_loja(contrato_id)) WITH CHECK (public.contrato_da_loja(contrato_id));

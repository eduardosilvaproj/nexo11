-- ============================================================
-- MOBILE APP - NEXO MOBILE
-- Novos tipos, tabelas e dados para o app mobile multi-perfil
-- ============================================================

-- ============================================================
-- ENUMS EXISTENTES - verificar e não recriar
-- ============================================================
-- public.app_role: admin, vendedor, tecnico, montador, gerente, franqueador
-- (já existe, mas precisamos adicionar medidor, conferente, entregue)
-- ============================================================

-- Novos roles para o app mobile
CREATE TYPE public.mobile_role AS ENUM ('vendedor','medidor','conferente','montador','entregue');

-- ============================================================
-- Check-in de Veículos
-- ============================================================
CREATE TABLE public.checkin_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo_acao TEXT NOT NULL CHECK (tipo_acao IN ('entrada','saida')),
  foto_veiculo_url TEXT,
  km_atual INTEGER,
  observacoes TEXT,
  localizacao_lat DOUBLE PRECISION,
  localizacao_lng DOUBLE PRECISION,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checkin_veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Checkin visível pelo próprio" ON public.checkin_veiculos
  FOR SELECT TO authenticated USING (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin', NULL));
CREATE POLICY "Checkin inserido pelo próprio" ON public.checkin_veiculos
  FOR INSERT TO authenticated WITH CHECK (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ));

-- ============================================================
-- Solicitações de Compras
-- ============================================================
CREATE TYPE public.solicitacao_compra_tipo AS ENUM ('material','uniforme','ferramenta','escritorio','outro');
CREATE TYPE public.solicitacao_compra_status AS ENUM ('pendente','aprovado','rejeitado','comprado');

CREATE TABLE public.solicitacoes_compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo public.solicitacao_compra_tipo NOT NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  urgencia TEXT CHECK (urgencia IN ('baixa','media','alta','urgente')),
  status public.solicitacao_compra_status NOT NULL DEFAULT 'pendente',
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitacoes_compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solicitacoes visíveis pelo próprio" ON public.solicitacoes_compras
  FOR SELECT TO authenticated USING (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin', NULL) OR public.has_role(auth.uid(), 'gerente', NULL));
CREATE POLICY "Solicitacoes gerenciadas pela loja" ON public.solicitacoes_compras
  FOR ALL TO authenticated USING (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ));
CREATE TRIGGER trg_solicitacoes_compras_updated BEFORE UPDATE ON public.solicitacoes_compras
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Envios de Documentos ao RH
-- ============================================================
CREATE TYPE public.documento_rh_tipo AS ENUM ('cnh','cpf','comprovante_residencia','contrato_trabalho','exames','fotos','documento_outro');
CREATE TYPE public.documento_rh_status AS ENUM ('pendente','em_analise','aprovado','rejeitado');

CREATE TABLE public.envios_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo_documento public.documento_rh_tipo NOT NULL,
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT,
  status public.documento_rh_status NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  analisado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.envios_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Documentos visíveis pelo próprio" ON public.envios_documentos
  FOR SELECT TO authenticated USING (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin', NULL));
CREATE POLICY "Documentos inseridos pelo próprio" ON public.envios_documentos
  FOR INSERT TO authenticated WITH CHECK (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ));

-- ============================================================
-- Informes empresariais
-- ============================================================
CREATE TABLE public.informes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  criado_por UUID REFERENCES public.pessoas(id),
  para_roles TEXT[] DEFAULT ARRAY['all'],
  urgente BOOLEAN NOT NULL DEFAULT false,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.informes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Informes visíveis por role" ON public.informes
  FOR SELECT TO authenticated USING (
    para_roles && ARRAY['all'] OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::TEXT = ANY(para_roles))
  );
CREATE POLICY "Informes criados por admin" ON public.informes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin', NULL));

-- ============================================================
-- Feedback (sugestões e reclamações)
-- ============================================================
CREATE TYPE public.feedback_tipo AS ENUM ('sugestao','reclamacao','elogio','duvida');
CREATE TYPE public.feedback_status AS ENUM ('aberto','em_andamento','resolvido','fechado');

CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo public.feedback_tipo NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status public.feedback_status NOT NULL DEFAULT 'aberto',
  resposta TEXT,
  respondido_por UUID REFERENCES public.pessoas(id),
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feedback visível pelo próprio" ON public.feedback
  FOR SELECT TO authenticated USING (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin', NULL) OR public.has_role(auth.uid(), 'gerente', NULL));
CREATE POLICY "Feedback inserido pelo próprio" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ));
CREATE TRIGGER trg_feedback_updated BEFORE UPDATE ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Fotos de Obra (montador envia durante execução)
-- ============================================================
CREATE TYPE public.foto_obra_tipo AS ENUM ('antes','evolucao','depois','problema','referencia');

CREATE TABLE public.fotos_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  foto_url TEXT NOT NULL,
  tipo public.foto_obra_tipo NOT NULL DEFAULT 'evolucao',
  legenda TEXT,
  data_envio TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fotos_obra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fotos visíveis por contrato" ON public.fotos_obra
  FOR SELECT TO authenticated USING (
    public.contrato_da_loja(os_id) OR
    pessoa_id IN (SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid())
  );
CREATE POLICY "Fotos inseridas pelo próprio" ON public.fotos_obra
  FOR INSERT TO authenticated WITH CHECK (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ));

-- ============================================================
-- Solicitações de Depósito (montador pede material)
-- ============================================================
CREATE TYPE public.solicitacao_deposito_status AS ENUM ('solicitado','aprovado','negado','recebido');

CREATE TABLE public.solicitacoes_deposito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo_material TEXT NOT NULL CHECK (tipo_material IN ('ferragem','mdf','montagem','limpeza','outro')),
  descricao TEXT,
  quantidade INTEGER DEFAULT 1,
  status public.solicitacao_deposito_status NOT NULL DEFAULT 'solicitado',
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitacoes_deposito ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deposito visível por OS" ON public.solicitacoes_deposito
  FOR SELECT TO authenticated USING (
    public.contrato_da_loja(os_id) OR
    pessoa_id IN (SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid())
  );
CREATE POLICY "Deposito inserido pelo próprio" ON public.solicitacoes_deposito
  FOR INSERT TO authenticated WITH CHECK (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ));
CREATE TRIGGER trg_solicitacoes_deposito_updated BEFORE UPDATE ON public.solicitacoes_deposito
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Romaneios de Entrega
-- ============================================================
CREATE TABLE public.romaneios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entregue_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  data_prevista DATE,
  data_entrega DATE,
  status_entrega TEXT CHECK (status_entrega IN ('agendado','em_rota','entregue','problema')),
  itens JSONB,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.romaneios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Romaneios visíveis pelo próprio ou loja" ON public.romaneios
  FOR SELECT TO authenticated USING (
    entregue_id IN (SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()) OR
    public.contrato_da_loja(obra_id) OR
    public.has_role(auth.uid(), 'admin', NULL)
  );
CREATE POLICY "Romaneios inseridos pelo próprio" ON public.romaneios
  FOR INSERT TO authenticated WITH CHECK (entregue_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ));
CREATE TRIGGER trg_romaneios_updated BEFORE UPDATE ON public.romaneios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Andamentos por papel (acompanhamento individual)
-- ============================================================
CREATE TYPE public.andamento_tipo AS ENUM ('medição','conferência','montagem','entrega');

CREATE TABLE public.andamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  tipo public.andamento_tipo NOT NULL,
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.andamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Andamentos visíveis" ON public.andamentos
  FOR SELECT TO authenticated USING (
    public.contrato_da_loja(contrato_id) OR
    pessoa_id IN (SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin', NULL)
  );
CREATE POLICY "Andamentos inseridos pelo próprio" ON public.andamentos
  FOR ALL TO authenticated USING (
    pessoa_id IN (SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid())
  );
CREATE TRIGGER trg_andamentos_updated BEFORE UPDATE ON public.andamentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Preferência mobile do usuário
-- ============================================================
CREATE TABLE public.mobile_preferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE UNIQUE,
  role_ativo TEXT DEFAULT 'vendedor',
  tema TEXT DEFAULT 'light' CHECK (tema IN ('light','dark','system')),
  notificacoes_ativas BOOLEAN DEFAULT true,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mobile_preferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Preferencias visíveis pelo próprio" ON public.mobile_preferencias
  FOR ALL TO authenticated USING (pessoa_id IN (
    SELECT p.id FROM public.pessoas p WHERE p.auth_user_id = auth.uid()
  ));
CREATE TRIGGER trg_mobile_preferencias_updated BEFORE UPDATE ON public.mobile_preferencias
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Platform admin role
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_role') THEN
    CREATE TYPE public.platform_role AS ENUM ('platform_admin', 'platform_support');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.platform_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.platform_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.platform_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id UUID, _role public.platform_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_user_roles WHERE user_id = _user_id AND role IN ('platform_admin','platform_support'));
$$;

CREATE POLICY "Platform admins manage roles" ON public.platform_user_roles
FOR ALL USING (public.has_platform_role(auth.uid(), 'platform_admin'))
WITH CHECK (public.has_platform_role(auth.uid(), 'platform_admin'));

-- Plans
CREATE TABLE IF NOT EXISTS public.saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
  limite_filiais INT NOT NULL DEFAULT 1,
  limite_usuarios INT NOT NULL DEFAULT 5,
  limite_envios_diarios INT NOT NULL DEFAULT 50,
  ativo BOOLEAN NOT NULL DEFAULT true,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage plans" ON public.saas_plans
FOR ALL USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.has_platform_role(auth.uid(),'platform_admin'));

CREATE POLICY "Authenticated users can view active plans" ON public.saas_plans
FOR SELECT USING (auth.uid() IS NOT NULL AND ativo = true);

-- Clients (subscribers)
CREATE TABLE IF NOT EXISTS public.saas_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL,
  cnpj TEXT,
  email_contato TEXT NOT NULL,
  telefone TEXT,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | suspended | trial | cancelled
  observacoes TEXT,
  owner_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saas_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage clients" ON public.saas_clients
FOR ALL USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.has_platform_role(auth.uid(),'platform_admin'));

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_client_id UUID NOT NULL REFERENCES public.saas_clients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.saas_plans(id),
  status TEXT NOT NULL DEFAULT 'active', -- active | trial | past_due | cancelled | suspended
  inicio_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  proximo_ciclo_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage subscriptions" ON public.saas_subscriptions
FOR ALL USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.has_platform_role(auth.uid(),'platform_admin'));

-- Link lojas to saas_client
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS saas_client_id UUID REFERENCES public.saas_clients(id);
CREATE INDEX IF NOT EXISTS idx_lojas_saas_client ON public.lojas(saas_client_id);

-- Support tickets
CREATE TABLE IF NOT EXISTS public.saas_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_client_id UUID REFERENCES public.saas_clients(id) ON DELETE SET NULL,
  loja_id UUID,
  assunto TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'suporte', -- suporte | sugestao | bug | duvida
  prioridade TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'aberto',
  criado_por UUID,
  atribuido_a UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saas_support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage tickets" ON public.saas_support_tickets
FOR ALL USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can create tickets" ON public.saas_support_tickets
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND criado_por = auth.uid());

-- Audit logs
CREATE TABLE IF NOT EXISTS public.saas_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saas_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins view audit" ON public.saas_audit_logs
FOR SELECT USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins insert audit" ON public.saas_audit_logs
FOR INSERT WITH CHECK (public.is_platform_admin(auth.uid()));

-- Triggers updated_at (reuse existing function if present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION public.update_updated_at_column() RETURNS TRIGGER
    LANGUAGE plpgsql SET search_path = public AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $f$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_saas_plans_updated ON public.saas_plans;
CREATE TRIGGER trg_saas_plans_updated BEFORE UPDATE ON public.saas_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_clients_updated ON public.saas_clients;
CREATE TRIGGER trg_saas_clients_updated BEFORE UPDATE ON public.saas_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_subs_updated ON public.saas_subscriptions;
CREATE TRIGGER trg_saas_subs_updated BEFORE UPDATE ON public.saas_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_tickets_updated ON public.saas_support_tickets;
CREATE TRIGGER trg_saas_tickets_updated BEFORE UPDATE ON public.saas_support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default plans
INSERT INTO public.saas_plans (nome, descricao, preco_mensal, limite_filiais, limite_usuarios, limite_envios_diarios)
SELECT 'Starter', 'Plano inicial para 1 loja', 199, 1, 5, 50
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE nome = 'Starter');

INSERT INTO public.saas_plans (nome, descricao, preco_mensal, limite_filiais, limite_usuarios, limite_envios_diarios)
SELECT 'Pro', 'Até 3 filiais e 15 usuários', 499, 3, 15, 200
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE nome = 'Pro');

INSERT INTO public.saas_plans (nome, descricao, preco_mensal, limite_filiais, limite_usuarios, limite_envios_diarios)
SELECT 'Enterprise', 'Filiais e usuários ilimitados', 1499, 999, 999, 1000
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE nome = 'Enterprise');

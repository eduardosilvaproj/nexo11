-- 1. Reforçar roles e permissões de plataforma
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_role') THEN
        CREATE TYPE public.platform_role AS ENUM ('platform_admin', 'platform_support');
    END IF;
END $$;

-- Garantir que a tabela platform_user_roles use o enum correto e tenha RLS
ALTER TABLE public.platform_user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para platform_user_roles (Segurança Máxima)
-- Apenas platform_admin pode ver e gerenciar roles de plataforma
CREATE POLICY "platform_admin_manage_roles" ON public.platform_user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.platform_user_roles 
            WHERE user_id = auth.uid() AND role = 'platform_admin'
        )
    );

-- 2. Segurança nas tabelas SaaS
ALTER TABLE public.saas_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para saas_clients
CREATE POLICY "platform_admin_all_clients" ON public.saas_clients FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.platform_user_roles WHERE user_id = auth.uid() AND role = 'platform_admin'));

CREATE POLICY "platform_support_view_clients" ON public.saas_clients FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.platform_user_roles WHERE user_id = auth.uid() AND role = 'platform_support'));

-- Políticas para saas_audit_logs (Imutável, apenas leitura por admins)
CREATE POLICY "platform_admin_view_audit" ON public.saas_audit_logs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.platform_user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin', 'platform_support')));

CREATE POLICY "platform_system_insert_audit" ON public.saas_audit_logs FOR INSERT 
    WITH CHECK (true); -- Permitido via triggers/funções internas

-- 3. Função para registrar auditoria automaticamente
CREATE OR REPLACE FUNCTION public.log_saas_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.saas_audit_logs (user_id, action, target_table, target_id, details)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        jsonb_build_object(
            'old', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
            'new', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
        )
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers de auditoria
CREATE TRIGGER audit_saas_clients AFTER INSERT OR UPDATE OR DELETE ON public.saas_clients FOR EACH ROW EXECUTE FUNCTION log_saas_action();
CREATE TRIGGER audit_saas_subscriptions AFTER INSERT OR UPDATE OR DELETE ON public.saas_subscriptions FOR EACH ROW EXECUTE FUNCTION log_saas_action();

-- 4. Fluxo de Provisionamento Automático
-- Quando um cliente é criado com status 'active', criar loja matriz e limites
CREATE OR REPLACE FUNCTION public.provision_new_client()
RETURNS TRIGGER AS $$
DECLARE
    v_store_id UUID;
    v_plan_id UUID;
BEGIN
    -- Se o cliente for novo e ativo, ou status mudar para ativo
    IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
        
        -- 1. Criar Loja Matriz
        INSERT INTO public.lojas (nome, cidade, estado, tipo, ativo, saas_client_id)
        VALUES (NEW.nome_empresa || ' - Matriz', 'Sede', 'ST', 'matriz', true, NEW.id)
        RETURNING id INTO v_store_id;

        -- 2. Tentar buscar um plano default se não houver assinatura (opcional)
        SELECT id INTO v_plan_id FROM public.saas_plans WHERE nome ILIKE '%Starter%' LIMIT 1;
        
        IF v_plan_id IS NOT NULL THEN
            INSERT INTO public.saas_subscriptions (client_id, plan_id, status)
            VALUES (NEW.id, v_plan_id, 'active');
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_provision_client
AFTER INSERT OR UPDATE OF status ON public.saas_clients
FOR EACH ROW EXECUTE FUNCTION provision_new_client();

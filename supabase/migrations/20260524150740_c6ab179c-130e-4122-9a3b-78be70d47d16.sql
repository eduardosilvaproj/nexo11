-- 1. Corrigir função de auditoria
CREATE OR REPLACE FUNCTION public.log_saas_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.saas_audit_logs (actor_user_id, acao, entidade, entidade_id, detalhes)
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

-- 2. Refinar provisionamento com Idempotência
CREATE OR REPLACE FUNCTION public.provision_new_client()
RETURNS TRIGGER AS $$
DECLARE
    v_store_id UUID;
    v_plan_id UUID;
BEGIN
    -- Se o cliente for novo e ativo, ou status mudar para ativo
    IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
        
        -- Verificar se já existe loja matriz para este cliente (Idempotência)
        IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE saas_client_id = NEW.id AND tipo = 'matriz') THEN
            -- Criar Loja Matriz
            INSERT INTO public.lojas (nome, cidade, estado, tipo, ativo, saas_client_id)
            VALUES (NEW.nome_empresa || ' - Matriz', 'Sede', 'ST', 'matriz', true, NEW.id)
            RETURNING id INTO v_store_id;
        END IF;

        -- Verificar se já existe assinatura ativa
        IF NOT EXISTS (SELECT 1 FROM public.saas_subscriptions WHERE client_id = NEW.id AND status = 'active') THEN
            -- Buscar plano Starter
            SELECT id INTO v_plan_id FROM public.saas_plans WHERE nome ILIKE '%Starter%' LIMIT 1;
            
            IF v_plan_id IS NOT NULL THEN
                INSERT INTO public.saas_subscriptions (client_id, plan_id, status, trial_ends_at)
                VALUES (NEW.id, v_plan_id, 'active', now() + interval '14 days');
            END IF;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

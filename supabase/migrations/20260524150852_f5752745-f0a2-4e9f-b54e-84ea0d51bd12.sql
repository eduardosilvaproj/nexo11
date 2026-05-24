-- Corrigir função de provisionamento com os nomes corretos de colunas
CREATE OR REPLACE FUNCTION public.provision_new_client()
RETURNS TRIGGER AS $$
DECLARE
    v_store_id UUID;
    v_plan_id UUID;
BEGIN
    -- Se o cliente for novo e ativo, ou status mudar para ativo
    IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
        
        -- 1. Loja Matriz (Idempotente)
        IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE saas_client_id = NEW.id AND tipo = 'matriz') THEN
            INSERT INTO public.lojas (nome, cidade, estado, tipo, ativo, saas_client_id)
            VALUES (NEW.nome_empresa || ' - Matriz', 'Sede', 'ST', 'matriz', true, NEW.id)
            RETURNING id INTO v_store_id;
        END IF;

        -- 2. Assinatura (Idempotente)
        IF NOT EXISTS (SELECT 1 FROM public.saas_subscriptions WHERE saas_client_id = NEW.id AND status = 'active') THEN
            SELECT id INTO v_plan_id FROM public.saas_plans WHERE nome ILIKE '%Starter%' LIMIT 1;
            
            IF v_plan_id IS NOT NULL THEN
                INSERT INTO public.saas_subscriptions (saas_client_id, plan_id, status, inicio_em, proximo_ciclo_em, metadata)
                VALUES (
                    NEW.id, 
                    v_plan_id, 
                    'active', 
                    now(), 
                    now() + interval '30 days',
                    jsonb_build_object('trial_ends_at', (now() + interval '14 days')::text)
                );
            END IF;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

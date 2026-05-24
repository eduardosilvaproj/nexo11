-- Function to trigger Portal Link automation with duplicate guard
CREATE OR REPLACE FUNCTION public.trigger_portal_link_automation()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente_id UUID;
    v_loja_id UUID;
    v_comunicacao_id UUID;
    v_exists_recent BOOLEAN;
    v_cliente_contato TEXT;
    v_cliente_email TEXT;
    v_canal_preferencial TEXT := 'email'; -- Default
BEGIN
    -- 1. Get contract and customer data
    SELECT loja_id, cliente_id INTO v_loja_id, v_cliente_id FROM public.contratos WHERE id = NEW.id;
    
    -- ONLY FOR MATRIZ PRINCIPAL (Pilot Store)
    IF v_loja_id != '071b6cfd-8138-4baf-b33a-94a903c321ef' THEN
        RETURN NEW;
    END IF;

    -- 2. Get customer contact info
    SELECT email, telefone INTO v_cliente_email, v_cliente_contato FROM public.clientes WHERE id = v_cliente_id;

    -- 3. Duplicate Guard: Check if a portal_link communication was sent in the last 24h
    SELECT EXISTS (
        SELECT 1 FROM public.cliente_comunicacoes 
        WHERE loja_id = v_loja_id 
        AND cliente_id = v_cliente_id 
        AND contrato_id = NEW.id
        AND tipo = 'portal_link'
        AND created_at > (now() - interval '24 hours')
    ) INTO v_exists_recent;

    IF v_exists_recent THEN
        RETURN NEW;
    END IF;

    -- 4. Determine channel based on availability (Prefer email, fallback to phone)
    IF v_cliente_email IS NOT NULL AND v_cliente_email != '' THEN
        v_canal_preferencial := 'email';
    ELSIF v_cliente_contato IS NOT NULL AND v_cliente_contato != '' THEN
        v_canal_preferencial := 'whatsapp';
    ELSE
        -- No contact info, skip
        RETURN NEW;
    END IF;

    -- 5. Create record in cliente_comunicacoes
    INSERT INTO public.cliente_comunicacoes (
        loja_id, 
        cliente_id, 
        contrato_id, 
        tipo, 
        canal, 
        destinatario, 
        assunto, 
        mensagem, 
        status
    ) VALUES (
        v_loja_id,
        v_cliente_id,
        NEW.id,
        'portal_link',
        v_canal_preferencial,
        CASE WHEN v_canal_preferencial = 'email' THEN v_cliente_email ELSE v_cliente_contato END,
        'Seu acesso ao Portal do Cliente NEXO',
        'Olá! Aqui está seu link de acesso ao portal: https://portal.nexo.app/acesso/' || NEW.id,
        'preparado'
    ) RETURNING id INTO v_comunicacao_id;

    -- 6. Create record in communication_outbox
    INSERT INTO public.communication_outbox (
        loja_id,
        cliente_id,
        contrato_id,
        comunicacao_id,
        canal,
        destinatario,
        assunto,
        mensagem,
        status,
        max_tentativas
    ) VALUES (
        v_loja_id,
        v_cliente_id,
        NEW.id,
        v_comunicacao_id,
        v_canal_preferencial,
        CASE WHEN v_canal_preferencial = 'email' THEN v_cliente_email ELSE v_cliente_contato END,
        'Seu acesso ao Portal do Cliente NEXO',
        'Olá! Aqui está seu link de acesso ao portal: https://portal.nexo.app/acesso/' || NEW.id,
        'pendente',
        3
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new contracts
DROP TRIGGER IF EXISTS tr_contrato_portal_link_created ON public.contratos;
CREATE TRIGGER tr_contrato_portal_link_created
AFTER INSERT ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_portal_link_automation();

-- Trigger for status update (e.g. starting tecnico phase)
DROP TRIGGER IF EXISTS tr_contrato_portal_link_status_change ON public.contratos;
CREATE TRIGGER tr_contrato_portal_link_status_change
AFTER UPDATE OF status ON public.contratos
FOR EACH ROW
WHEN (NEW.status IN ('tecnico', 'producao') AND OLD.status != NEW.status)
EXECUTE FUNCTION public.trigger_portal_link_automation();

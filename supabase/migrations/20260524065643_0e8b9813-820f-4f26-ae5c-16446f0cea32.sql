-- 1. Table for Client Portal Access
CREATE TABLE IF NOT EXISTS public.cliente_portal_acessos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id),
    contrato_id UUID NOT NULL REFERENCES public.contratos(id),
    token_hash TEXT NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT true,
    expira_em TIMESTAMPTZ,
    ultimo_acesso_em TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add visibility columns to existing tables
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_emitidos' AND column_name = 'visivel_cliente') THEN
        ALTER TABLE public.documentos_emitidos ADD COLUMN visivel_cliente BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contrato_eventos' AND column_name = 'visivel_cliente') THEN
        ALTER TABLE public.contrato_eventos ADD COLUMN visivel_cliente BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.cliente_portal_acessos ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Internal Management (admins/managers/vendedores)
CREATE POLICY portal_acessos_admin_view ON public.cliente_portal_acessos FOR SELECT USING (public.is_store_admin_or_manager(loja_id));
CREATE POLICY portal_acessos_admin_manage ON public.cliente_portal_acessos FOR ALL USING (public.is_store_admin_or_manager(loja_id));

-- 5. RPC to validate portal token and get data safely
CREATE OR REPLACE FUNCTION public.portal_cliente_validar_token(p_token text)
RETURNS UUID AS $$
    SELECT contrato_id 
    FROM public.cliente_portal_acessos 
    WHERE token_hash = p_token 
      AND ativo = true 
      AND (expira_em IS NULL OR expira_em > now())
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Helper to get contract ID from header token
CREATE OR REPLACE FUNCTION public.get_portal_contrato_id()
RETURNS UUID AS $$
DECLARE
    v_token TEXT;
BEGIN
    v_token := COALESCE(current_setting('request.headers', true)::json ->> 'x-portal-token', '');
    RETURN public.portal_cliente_validar_token(v_token);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 6. RPC to open a post-sales ticket from the portal
CREATE OR REPLACE FUNCTION public.portal_cliente_abrir_chamado(
    p_token TEXT,
    p_tipo TEXT,
    p_ambiente UUID,
    p_descricao TEXT,
    p_contato TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_contrato_id UUID;
    v_loja_id UUID;
    v_chamado_id UUID;
BEGIN
    -- Validate token
    v_contrato_id := public.portal_cliente_validar_token(p_token);
    IF v_contrato_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Sessão inválida');
    END IF;

    -- Get store ID
    SELECT loja_id INTO v_loja_id FROM public.contratos WHERE id = v_contrato_id;

    -- Insert ticket (assuming chamado_tipo is an enum, we might need a cast or use text)
    INSERT INTO public.chamados_pos_venda (
        contrato_id,
        tipo,
        descricao,
        status
    ) VALUES (
        v_contrato_id,
        p_tipo::public.chamado_tipo,
        p_descricao,
        'aberto'
    ) RETURNING id INTO v_chamado_id;

    -- Register event
    INSERT INTO public.contrato_eventos (
        loja_id,
        contrato_id,
        tipo,
        modulo,
        titulo,
        descricao,
        visivel_cliente
    ) VALUES (
        v_loja_id,
        v_contrato_id,
        'chamado_aberto',
        'pos_venda',
        'Novo Chamado Aberto',
        'Chamado aberto pelo cliente via portal.',
        true
    );

    RETURN jsonb_build_object('ok', true, 'id', v_chamado_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Grant access for anon users (since portal uses a shared token, not auth)
GRANT SELECT ON public.contratos TO anon;
GRANT SELECT ON public.lojas TO anon;
GRANT SELECT ON public.documentos_emitidos TO anon;
GRANT SELECT ON public.contrato_eventos TO anon;
GRANT SELECT ON public.contrato_ambientes TO anon;
GRANT SELECT ON public.entregas TO anon;
GRANT SELECT ON public.agendamentos_montagem TO anon;

-- Add RLS Policies for Anon access based on token
CREATE POLICY anon_portal_contrato_view ON public.contratos FOR SELECT TO anon USING (id = public.get_portal_contrato_id());
CREATE POLICY anon_portal_loja_view ON public.lojas FOR SELECT TO anon USING (id IN (SELECT loja_id FROM public.contratos WHERE id = public.get_portal_contrato_id()));
CREATE POLICY anon_portal_docs_view ON public.documentos_emitidos FOR SELECT TO anon USING (contrato_id = public.get_portal_contrato_id() AND visivel_cliente = true);
CREATE POLICY anon_portal_events_view ON public.contrato_eventos FOR SELECT TO anon USING (contrato_id = public.get_portal_contrato_id() AND visivel_cliente = true);
CREATE POLICY anon_portal_ambientes_view ON public.contrato_ambientes FOR SELECT TO anon USING (contrato_id = public.get_portal_contrato_id());
CREATE POLICY anon_portal_entregas_view ON public.entregas FOR SELECT TO anon USING (contrato_id = public.get_portal_contrato_id());
CREATE POLICY anon_portal_montagem_view ON public.agendamentos_montagem FOR SELECT TO anon USING (contrato_id = public.get_portal_contrato_id());

-- 8. Trigger to update updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_portal_acessos_updated_at BEFORE UPDATE ON public.cliente_portal_acessos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

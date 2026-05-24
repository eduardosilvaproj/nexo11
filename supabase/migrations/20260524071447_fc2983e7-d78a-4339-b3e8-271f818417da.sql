-- Create cliente_pesquisas table
CREATE TABLE IF NOT EXISTS public.cliente_pesquisas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id),
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    portal_token_id UUID REFERENCES public.portal_tokens(id) ON DELETE SET NULL,
    etapa TEXT NOT NULL, -- entrega, montagem, pos_venda, contrato_finalizado, atendimento, geral
    status TEXT NOT NULL DEFAULT 'enviada', -- enviada, respondida, cancelada, expirada
    nota INTEGER CHECK (nota >= 0 AND nota <= 10),
    classificacao TEXT, -- detrator, neutro, promotor
    comentario TEXT,
    motivos TEXT[], -- atendimento, prazo, qualidade_produto, qualidade_montagem, comunicacao, limpeza_organizacao, pos_venda, outro
    respondida_em TIMESTAMP WITH TIME ZONE,
    enviada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    enviada_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT cliente_pesquisas_etapa_check CHECK (etapa = ANY (ARRAY['entrega', 'montagem', 'pos_venda', 'contrato_finalizado', 'atendimento', 'geral'])),
    CONSTRAINT cliente_pesquisas_status_check CHECK (status = ANY (ARRAY['enviada', 'respondida', 'cancelada', 'expirada']))
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cliente_pesquisas_contrato ON public.cliente_pesquisas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_cliente_pesquisas_loja ON public.cliente_pesquisas(loja_id);

-- Enable RLS
ALTER TABLE public.cliente_pesquisas ENABLE ROW LEVEL SECURITY;

-- Policies for internal users
CREATE POLICY "Pesquisas visíveis por loja e papel" ON public.cliente_pesquisas
FOR SELECT TO authenticated
USING (
    has_role(auth.uid(), 'franqueador'::app_role) OR 
    (loja_id IN (SELECT u.loja_id FROM usuarios u WHERE u.id = auth.uid()))
);

CREATE POLICY "Internal users can insert surveys" ON public.cliente_pesquisas
FOR INSERT TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerente'::app_role) OR 
    has_role(auth.uid(), 'vendedor'::app_role) OR 
    has_role(auth.uid(), 'pos_venda'::app_role)
);

CREATE POLICY "Internal users can update surveys" ON public.cliente_pesquisas
FOR UPDATE TO authenticated
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerente'::app_role)
);

-- Policies for anonymous portal access (via RPC or specific tokens)
CREATE POLICY "Portal access to surveys" ON public.cliente_pesquisas
FOR SELECT TO anon
USING (
    portal_token_id IN (
        SELECT id FROM portal_tokens 
        WHERE token = current_setting('request.headers', true)::json->>'x-portal-token'
        AND revogado = false 
        AND expires_at > now()
    )
);

CREATE POLICY "Portal update response" ON public.cliente_pesquisas
FOR UPDATE TO anon
USING (
    portal_token_id IN (
        SELECT id FROM portal_tokens 
        WHERE token = current_setting('request.headers', true)::json->>'x-portal-token'
        AND revogado = false 
        AND expires_at > now()
    )
)
WITH CHECK (
    status = 'respondida' AND respondida_em IS NOT NULL
);

-- RPC for portal client to get surveys
CREATE OR REPLACE FUNCTION public.portal_cliente_obter_pesquisas()
RETURNS SETOF public.cliente_pesquisas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_text TEXT;
    v_contrato_id UUID;
BEGIN
    v_token_text := current_setting('request.headers', true)::json->>'x-portal-token';
    
    SELECT contrato_id INTO v_contrato_id
    FROM portal_tokens
    WHERE token = v_token_text
    AND revogado = false
    AND expires_at > now();

    IF v_contrato_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT * FROM cliente_pesquisas
    WHERE contrato_id = v_contrato_id
    AND status = 'enviada'
    ORDER BY created_at DESC;
END;
$$;

-- RPC for portal client to respond survey
CREATE OR REPLACE FUNCTION public.portal_cliente_responder_pesquisa(
    p_pesquisa_id UUID,
    p_nota INTEGER,
    p_comentario TEXT DEFAULT NULL,
    p_motivos TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_text TEXT;
    v_token_id UUID;
    v_contrato_id UUID;
    v_pesquisa RECORD;
    v_classificacao TEXT;
BEGIN
    v_token_text := current_setting('request.headers', true)::json->>'x-portal-token';
    
    SELECT id, contrato_id INTO v_token_id, v_contrato_id
    FROM portal_tokens
    WHERE token = v_token_text
    AND revogado = false
    AND expires_at > now();

    IF v_contrato_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
    END IF;

    SELECT * INTO v_pesquisa
    FROM cliente_pesquisas
    WHERE id = p_pesquisa_id
    AND contrato_id = v_contrato_id
    AND status = 'enviada';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pesquisa não encontrada ou já respondida');
    END IF;

    -- Calculate classification
    IF p_nota >= 9 THEN v_classificacao := 'promotor';
    ELSIF p_nota >= 7 THEN v_classificacao := 'neutro';
    ELSE v_classificacao := 'detrator';
    END IF;

    UPDATE cliente_pesquisas
    SET 
        nota = p_nota,
        comentario = p_comentario,
        motivos = p_motivos,
        classificacao = v_classificacao,
        status = 'respondida',
        respondida_em = now(),
        updated_at = now()
    WHERE id = p_pesquisa_id;

    -- Log event
    INSERT INTO contrato_eventos (
        contrato_id,
        loja_id,
        tipo,
        modulo,
        titulo,
        descricao,
        visivel_cliente
    ) VALUES (
        v_contrato_id,
        v_pesquisa.loja_id,
        'pesquisa_respondida',
        'satisfacao',
        'Pesquisa de Satisfação Respondida',
        'Cliente avaliou a etapa ' || v_pesquisa.etapa || ' com nota ' || p_nota || '.',
        false
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Trigger for update_updated_at_column
CREATE TRIGGER update_cliente_pesquisas_updated_at
BEFORE UPDATE ON public.cliente_pesquisas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela para Tokens de Push Notification
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    platform TEXT NOT NULL,
    token TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(usuario_id, token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar seus próprios tokens"
    ON public.device_tokens
    FOR ALL
    USING (auth.uid() = usuario_id);

CREATE POLICY "Admins e Gerentes podem visualizar tokens da loja"
    ON public.device_tokens
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND loja_id = public.device_tokens.loja_id
            AND role IN ('admin', 'gerente', 'franqueador')
        )
    );

-- Tabelas para Chat Interno
CREATE TABLE IF NOT EXISTS public.chat_conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('contrato', 'setor', 'direto', 'grupo')),
    contrato_id UUID REFERENCES public.contratos(id),
    modulo TEXT,
    titulo TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chat_participantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(conversa_id, usuario_id)
);

ALTER TABLE public.chat_participantes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chat_mensagens_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    conversa_id UUID NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    mensagem TEXT,
    anexo_url TEXT,
    tipo TEXT DEFAULT 'texto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.chat_mensagens_v2 ENABLE ROW LEVEL SECURITY;

-- Políticas para Chat
CREATE POLICY "Participantes podem ver suas conversas"
    ON public.chat_conversas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participantes
            WHERE conversa_id = public.chat_conversas.id
            AND usuario_id = auth.uid()
        )
    );

CREATE POLICY "Participantes podem ver membros da conversa"
    ON public.chat_participantes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participantes cp
            WHERE cp.conversa_id = public.chat_participantes.conversa_id
            AND cp.usuario_id = auth.uid()
        )
    );

CREATE POLICY "Participantes podem ler mensagens"
    ON public.chat_mensagens_v2
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participantes
            WHERE conversa_id = public.chat_mensagens_v2.conversa_id
            AND usuario_id = auth.uid()
        )
    );

CREATE POLICY "Participantes podem enviar mensagens"
    ON public.chat_mensagens_v2
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_participantes
            WHERE conversa_id = public.chat_mensagens_v2.conversa_id
            AND usuario_id = auth.uid()
        )
        AND usuario_id = auth.uid()
    );

-- Tabelas para Comunicados
CREATE TABLE IF NOT EXISTS public.comunicados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID REFERENCES public.lojas(id), -- NULL significa global/todas as lojas
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    prioridade TEXT DEFAULT 'media',
    perfil_destino TEXT,
    publicado_por UUID REFERENCES auth.users(id),
    publicado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expira_em TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true
);

ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.comunicado_leituras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comunicado_id UUID NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    lido_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(comunicado_id, usuario_id)
);

ALTER TABLE public.comunicado_leituras ENABLE ROW LEVEL SECURITY;

-- Políticas para Comunicados
CREATE POLICY "Usuários podem ver comunicados ativos de sua loja ou globais"
    ON public.comunicados
    FOR SELECT
    USING (
        ativo = true 
        AND (loja_id IS NULL OR loja_id IN (SELECT loja_id FROM public.user_roles WHERE user_id = auth.uid()))
    );

CREATE POLICY "Usuários podem marcar comunicados como lidos"
    ON public.comunicado_leituras
    FOR ALL
    USING (usuario_id = auth.uid());

-- Triggers para Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_device_tokens_updated_at
    BEFORE UPDATE ON public.device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_conversas_updated_at
    BEFORE UPDATE ON public.chat_conversas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

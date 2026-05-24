-- 1. Configurações de Comunicação por Loja
CREATE TABLE IF NOT EXISTS public.communication_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'email', 'sms')),
    provider TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT false,
    remetente TEXT,
    configuracao JSONB NOT NULL DEFAULT '{}'::jsonb,
    horario_inicio TIME,
    horario_fim TIME,
    limite_diario INTEGER,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (loja_id, canal)
);

-- 2. Preferências de Comunicação do Cliente
CREATE TABLE IF NOT EXISTS public.cliente_preferencias_comunicacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    whatsapp_opt_in BOOLEAN NOT NULL DEFAULT true,
    email_opt_in BOOLEAN NOT NULL DEFAULT true,
    sms_opt_in BOOLEAN NOT NULL DEFAULT false,
    canal_preferido TEXT,
    telefone_validado BOOLEAN NOT NULL DEFAULT false,
    email_validado BOOLEAN NOT NULL DEFAULT false,
    opt_out_em TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (loja_id, cliente_id)
);

-- 3. Outbox de Comunicação (Fila de Envios)
CREATE TABLE IF NOT EXISTS public.communication_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
    comunicacao_id UUID REFERENCES public.cliente_comunicacoes(id) ON DELETE SET NULL,
    canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'email', 'sms', 'manual')),
    provider TEXT,
    destinatario TEXT NOT NULL,
    template_key TEXT,
    assunto TEXT,
    mensagem TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'enviado', 'entregue', 'lido', 'falhou', 'cancelado', 'ignorado')),
    tentativas INTEGER NOT NULL DEFAULT 0,
    max_tentativas INTEGER NOT NULL DEFAULT 3,
    proxima_tentativa_em TIMESTAMPTZ,
    processado_em TIMESTAMPTZ,
    enviado_em TIMESTAMPTZ,
    entregue_em TIMESTAMPTZ,
    lido_em TIMESTAMPTZ,
    erro TEXT,
    provider_message_id TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_preferencias_comunicacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_outbox ENABLE ROW LEVEL SECURITY;

-- Policies for communication_settings
DROP POLICY IF EXISTS "View settings by store" ON public.communication_settings;
CREATE POLICY "View settings by store" ON public.communication_settings
    FOR SELECT TO authenticated
    USING (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()) OR has_role(auth.uid(), 'franqueador'));

DROP POLICY IF EXISTS "Manage settings by store managers" ON public.communication_settings;
CREATE POLICY "Manage settings by store managers" ON public.communication_settings
    FOR ALL TO authenticated
    USING ((loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente'))) OR has_role(auth.uid(), 'franqueador'));

-- Policies for cliente_preferencias_comunicacao
DROP POLICY IF EXISTS "View preferences by store" ON public.cliente_preferencias_comunicacao;
CREATE POLICY "View preferences by store" ON public.cliente_preferencias_comunicacao
    FOR SELECT TO authenticated
    USING (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()) OR has_role(auth.uid(), 'franqueador'));

DROP POLICY IF EXISTS "Manage preferences by store staff" ON public.cliente_preferencias_comunicacao;
CREATE POLICY "Manage preferences by store staff" ON public.cliente_preferencias_comunicacao
    FOR ALL TO authenticated
    USING (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()) OR has_role(auth.uid(), 'franqueador'));

-- Policies for communication_outbox
DROP POLICY IF EXISTS "View outbox by store" ON public.communication_outbox;
CREATE POLICY "View outbox by store" ON public.communication_outbox
    FOR SELECT TO authenticated
    USING (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()) OR has_role(auth.uid(), 'franqueador'));

DROP POLICY IF EXISTS "Manage outbox by store managers" ON public.communication_outbox;
CREATE POLICY "Manage outbox by store managers" ON public.communication_outbox
    FOR ALL TO authenticated
    USING ((loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente'))) OR has_role(auth.uid(), 'franqueador'));

DROP POLICY IF EXISTS "Insert into outbox by authorized staff" ON public.communication_outbox;
CREATE POLICY "Insert into outbox by authorized staff" ON public.communication_outbox
    FOR INSERT TO authenticated
    WITH CHECK (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()) OR has_role(auth.uid(), 'franqueador'));

-- Triggers for updated_at
DROP TRIGGER IF EXISTS tr_communication_settings_updated_at ON public.communication_settings;
CREATE TRIGGER tr_communication_settings_updated_at BEFORE UPDATE ON public.communication_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_cliente_preferencias_comunicacao_updated_at ON public.cliente_preferencias_comunicacao;
CREATE TRIGGER tr_cliente_preferencias_comunicacao_updated_at BEFORE UPDATE ON public.cliente_preferencias_comunicacao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_communication_outbox_updated_at ON public.communication_outbox;
CREATE TRIGGER tr_communication_outbox_updated_at BEFORE UPDATE ON public.communication_outbox FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

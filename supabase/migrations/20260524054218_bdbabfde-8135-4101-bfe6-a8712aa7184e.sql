-- Create bucket for operational documents and evidences if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('nexo-operacional', 'nexo-operacional', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for nexo-operacional
CREATE POLICY "Users can upload their own store files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nexo-operacional' AND (storage.foldername(name))[1] = (SELECT loja_id::text FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "Users can view their own store files"
ON storage.objects FOR SELECT
USING (bucket_id = 'nexo-operacional' AND (storage.foldername(name))[1] = (SELECT loja_id::text FROM public.usuarios WHERE id = auth.uid()));

-- Create table for document approvals/signatures
CREATE TABLE IF NOT EXISTS public.documento_aceites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    documento_id UUID NOT NULL REFERENCES public.documentos_emitidos(id) ON DELETE CASCADE,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES auth.users(id),
    nome_responsavel TEXT NOT NULL,
    documento_responsavel TEXT,
    tipo TEXT NOT NULL DEFAULT 'aceite', -- aceite, assinatura_cliente, assinatura_responsavel, recebimento, conclusao, ciência, ressalva
    observacoes TEXT,
    assinatura_url TEXT,
    ip_origem TEXT,
    user_agent TEXT,
    aceito_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for documento_aceites
ALTER TABLE public.documento_aceites ENABLE ROW LEVEL SECURITY;

-- Policies for documento_aceites
CREATE POLICY "Users can view approvals from their store"
ON public.documento_aceites FOR SELECT
USING (loja_id = (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "Users can create approvals for their store"
ON public.documento_aceites FOR INSERT
WITH CHECK (loja_id = (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()));

-- Create table for operational attachments/evidences
CREATE TABLE IF NOT EXISTS public.anexos_operacionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
    documento_id UUID REFERENCES public.documentos_emitidos(id) ON DELETE SET NULL,
    entidade_tipo TEXT NOT NULL, -- contrato, documento, logistica, montagem, financeiro, pos_venda, almoxarifado
    entidade_id UUID,
    modulo TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'arquivo', -- foto, comprovante, assinatura, arquivo, evidencia, ressalva
    titulo TEXT NOT NULL,
    descricao TEXT,
    arquivo_url TEXT NOT NULL,
    mime_type TEXT,
    tamanho_bytes BIGINT,
    enviado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for anexos_operacionais
ALTER TABLE public.anexos_operacionais ENABLE ROW LEVEL SECURITY;

-- Policies for anexos_operacionais
CREATE POLICY "Users can view attachments from their store"
ON public.anexos_operacionais FOR SELECT
USING (
    loja_id = (SELECT loja_id FROM public.usuarios WHERE id = auth.uid())
    AND (
        modulo != 'financeiro' 
        OR EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND (role IN ('admin', 'admin_master', 'gerente', 'financeiro'))
        )
    )
);

CREATE POLICY "Users can create attachments for their store"
ON public.anexos_operacionais FOR INSERT
WITH CHECK (loja_id = (SELECT loja_id FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own attachments"
ON public.anexos_operacionais FOR DELETE
USING (enviado_por = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'admin_master', 'gerente')));

-- Trigger to log document acceptance in timeline
CREATE OR REPLACE FUNCTION public.fn_log_documento_aceite_timeline()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contrato_id IS NOT NULL THEN
        INSERT INTO public.contrato_eventos (
            contrato_id,
            loja_id,
            usuario_id,
            tipo,
            titulo,
            descricao,
            modulo,
            metadata
        ) VALUES (
            NEW.contrato_id,
            NEW.loja_id,
            NEW.usuario_id,
            'documento_aceito',
            'Documento assinado/aceito',
            'Documento ' || (SELECT titulo FROM documentos_emitidos WHERE id = NEW.documento_id) || ' foi aceito por ' || NEW.nome_responsavel,
            'documentos',
            jsonb_build_object('documento_id', NEW.documento_id, 'aceite_id', NEW.id, 'tipo_aceite', NEW.tipo)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_log_documento_aceite_timeline
AFTER INSERT ON public.documento_aceites
FOR EACH ROW EXECUTE FUNCTION public.fn_log_documento_aceite_timeline();

-- Trigger to log attachment in timeline
CREATE OR REPLACE FUNCTION public.fn_log_anexo_operacional_timeline()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contrato_id IS NOT NULL THEN
        INSERT INTO public.contrato_eventos (
            contrato_id,
            loja_id,
            usuario_id,
            tipo,
            titulo,
            descricao,
            modulo,
            metadata,
            visivel_para_cliente
        ) VALUES (
            NEW.contrato_id,
            NEW.loja_id,
            NEW.enviado_por,
            'anexo_adicionado',
            'Nova evidência/anexo: ' || NEW.titulo,
            'Anexo do tipo ' || NEW.tipo || ' adicionado ao módulo ' || NEW.modulo,
            NEW.modulo,
            jsonb_build_object('anexo_id', NEW.id, 'modulo', NEW.modulo, 'tipo', NEW.tipo),
            false
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_log_anexo_operacional_timeline
AFTER INSERT ON public.anexos_operacionais
FOR EACH ROW EXECUTE FUNCTION public.fn_log_anexo_operacional_timeline();

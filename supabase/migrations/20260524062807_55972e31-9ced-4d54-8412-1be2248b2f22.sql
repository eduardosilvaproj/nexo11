-- Add 'rh' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rh';

-- Create rh_funcionarios table
CREATE TABLE IF NOT EXISTS public.rh_funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    user_id UUID REFERENCES auth.users(id),
    usuario_id UUID REFERENCES public.usuarios(id),
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cpf TEXT,
    cargo TEXT,
    setor TEXT,
    data_admissao DATE,
    data_nascimento DATE,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'ferias', 'afastado', 'desligado', 'inativo')),
    endereco TEXT,
    contato_emergencia_nome TEXT,
    contato_emergencia_telefone TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create rh_solicitacoes table
CREATE TABLE IF NOT EXISTS public.rh_solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    funcionario_id UUID NOT NULL REFERENCES public.rh_funcionarios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('ferias', 'folga', 'atestado', 'afastamento', 'justificativa', 'alteracao_dados', 'outros')),
    status TEXT NOT NULL DEFAULT 'enviada' CHECK (status IN ('enviada', 'em_analise', 'aprovada', 'recusada', 'cancelada')),
    data_inicio DATE,
    data_fim DATE,
    motivo TEXT,
    observacoes TEXT,
    anexo_url TEXT,
    analisado_por UUID REFERENCES auth.users(id),
    analisado_em TIMESTAMPTZ,
    resposta TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create rh_documentos table
CREATE TABLE IF NOT EXISTS public.rh_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    funcionario_id UUID NOT NULL REFERENCES public.rh_funcionarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('documento_pessoal', 'contrato', 'certificado', 'treinamento', 'atestado', 'termo', 'outros')),
    titulo TEXT NOT NULL,
    descricao TEXT,
    arquivo_url TEXT NOT NULL,
    visivel_funcionario BOOLEAN NOT NULL DEFAULT false,
    enviado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create rh_eventos table
CREATE TABLE IF NOT EXISTS public.rh_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    funcionario_id UUID NOT NULL REFERENCES public.rh_funcionarios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    entidade_tipo TEXT,
    entidade_id UUID,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rh_funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_eventos ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin/franqueador or manager/rh of the store
CREATE OR REPLACE FUNCTION public.is_rh_admin_or_manager(target_loja_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin_master', 'admin', 'franqueador')
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('gerente', 'rh') 
            AND (loja_id = target_loja_id OR loja_id IS NULL)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- rh_funcionarios policies
CREATE POLICY rh_funcionarios_admin_view ON public.rh_funcionarios FOR SELECT USING (public.is_rh_admin_or_manager(loja_id));
CREATE POLICY rh_funcionarios_self_view ON public.rh_funcionarios FOR SELECT USING (user_id = auth.uid());
CREATE POLICY rh_funcionarios_admin_manage ON public.rh_funcionarios FOR ALL USING (public.is_rh_admin_or_manager(loja_id));

-- rh_solicitacoes policies
CREATE POLICY rh_solicitacoes_admin_view ON public.rh_solicitacoes FOR SELECT USING (public.is_rh_admin_or_manager(loja_id));
CREATE POLICY rh_solicitacoes_self_view ON public.rh_solicitacoes FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY rh_solicitacoes_self_insert ON public.rh_solicitacoes FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY rh_solicitacoes_admin_update ON public.rh_solicitacoes FOR UPDATE USING (public.is_rh_admin_or_manager(loja_id));

-- rh_documentos policies
CREATE POLICY rh_documentos_admin_manage ON public.rh_documentos FOR ALL USING (public.is_rh_admin_or_manager(loja_id));
CREATE POLICY rh_documentos_self_view ON public.rh_documentos FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rh_funcionarios WHERE id = funcionario_id AND user_id = auth.uid()) 
    AND visivel_funcionario = true
);

-- rh_eventos policies
CREATE POLICY rh_eventos_admin_view ON public.rh_eventos FOR SELECT USING (public.is_rh_admin_or_manager(loja_id));
CREATE POLICY rh_eventos_self_view ON public.rh_eventos FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rh_funcionarios WHERE id = funcionario_id AND user_id = auth.uid())
);

-- Storage bucket for HR documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rh-documentos', 'rh-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (names should be quoted if they contain spaces, but let's use underscores for safety)
CREATE POLICY rh_storage_upload_admin ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rh-documentos' AND public.is_rh_admin_or_manager((storage.foldername(name))[1]::uuid));
CREATE POLICY rh_storage_view_admin ON storage.objects FOR SELECT USING (bucket_id = 'rh-documentos' AND public.is_rh_admin_or_manager((storage.foldername(name))[1]::uuid));
CREATE POLICY rh_storage_view_self ON storage.objects FOR SELECT USING (
    bucket_id = 'rh-documentos' 
    AND EXISTS (
        SELECT 1 FROM public.rh_funcionarios 
        WHERE user_id = auth.uid() 
        AND id::text = (storage.foldername(name))[2]
    )
);

-- Triggers for updated_at
-- (Assuming public.update_updated_at_column already exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_rh_funcionarios_updated_at BEFORE UPDATE ON public.rh_funcionarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        CREATE TRIGGER update_rh_solicitacoes_updated_at BEFORE UPDATE ON public.rh_solicitacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

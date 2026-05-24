CREATE TABLE IF NOT EXISTS public.mobile_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    perfil TEXT,
    plataforma TEXT,
    versao_app TEXT,
    modulo TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('bug', 'duvida', 'sugestao', 'melhoria')),
    impacto TEXT NOT NULL CHECK (impacto IN ('baixo', 'medio', 'alto', 'critico')),
    descricao TEXT NOT NULL,
    anexo_url TEXT,
    status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_analise', 'corrigido', 'descartado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mobile_feedback ENABLE ROW LEVEL SECURITY;

-- Usuários podem criar feedbacks e ver os seus próprios
CREATE POLICY "Usuários podem gerenciar seus próprios feedbacks"
    ON public.mobile_feedback
    FOR ALL
    USING (auth.uid() = usuario_id);

-- Admins e Gerentes podem ver todos os feedbacks da sua loja
CREATE POLICY "Admins e Gerentes podem ver feedbacks da loja"
    ON public.mobile_feedback
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND loja_id = public.mobile_feedback.loja_id
            AND role::text IN ('admin', 'gerente', 'franqueador', 'admin_master')
        )
    );

CREATE TRIGGER update_mobile_feedback_updated_at
    BEFORE UPDATE ON public.mobile_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

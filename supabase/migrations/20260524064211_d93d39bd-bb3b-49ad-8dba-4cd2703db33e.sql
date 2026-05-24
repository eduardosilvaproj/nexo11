-- 1. Create operacao_checkins
CREATE TABLE IF NOT EXISTS public.operacao_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    funcionario_id UUID REFERENCES public.rh_funcionarios(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    contrato_id UUID REFERENCES public.contratos(id),
    entidade_tipo TEXT NOT NULL, -- 'agendamentos_montagem', 'entregas', 'checklists_tecnicos', etc.
    entidade_id UUID NOT NULL,
    modulo TEXT NOT NULL, -- 'montagem', 'logistica', 'tecnico', etc.
    status TEXT NOT NULL DEFAULT 'iniciado' CHECK (status IN ('iniciado', 'pausado', 'concluido', 'cancelado', 'com_ocorrencia')),
    iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalizado_em TIMESTAMPTZ,
    duracao_minutos INTEGER,
    latitude_inicio NUMERIC,
    longitude_inicio NUMERIC,
    latitude_fim NUMERIC,
    longitude_fim NUMERIC,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create operacao_ocorrencias
CREATE TABLE IF NOT EXISTS public.operacao_ocorrencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    funcionario_id UUID REFERENCES public.rh_funcionarios(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    contrato_id UUID REFERENCES public.contratos(id),
    checkin_id UUID REFERENCES public.operacao_checkins(id),
    entidade_tipo TEXT NOT NULL,
    entidade_id UUID NOT NULL,
    modulo TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('cliente_ausente', 'material_faltando', 'avaria', 'atraso', 'divergencia', 'ambiente_indisponivel', 'servico_parcial', 'retorno_necessario', 'outro')),
    prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
    descricao TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_analise', 'resolvida', 'cancelada')),
    resolvido_por UUID REFERENCES auth.users(id),
    resolvido_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_checkins_loja ON public.operacao_checkins(loja_id);
CREATE INDEX IF NOT EXISTS idx_checkins_usuario ON public.operacao_checkins(usuario_id);
CREATE INDEX IF NOT EXISTS idx_checkins_contrato ON public.operacao_checkins(contrato_id);
CREATE INDEX IF NOT EXISTS idx_checkins_entidade ON public.operacao_checkins(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON public.operacao_checkins(status);

CREATE INDEX IF NOT EXISTS idx_ocorrencias_loja ON public.operacao_ocorrencias(loja_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_status ON public.operacao_ocorrencias(status);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_entidade ON public.operacao_ocorrencias(entidade_tipo, entidade_id);

-- Enable RLS
ALTER TABLE public.operacao_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operacao_ocorrencias ENABLE ROW LEVEL SECURITY;

-- Helper for store admin/manager check (assumes is_rh_admin_or_manager exists from previous step)
-- If not, let's create a more general one
CREATE OR REPLACE FUNCTION public.is_store_admin_or_manager(target_loja_id UUID) 
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Policies for operacao_checkins
CREATE POLICY checkins_admin_view ON public.operacao_checkins FOR SELECT USING (public.is_store_admin_or_manager(loja_id));
CREATE POLICY checkins_self_view ON public.operacao_checkins FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY checkins_self_insert ON public.operacao_checkins FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY checkins_self_update ON public.operacao_checkins FOR UPDATE USING (usuario_id = auth.uid());

-- Policies for operacao_ocorrencias
CREATE POLICY ocorrencias_admin_view ON public.operacao_ocorrencias FOR SELECT USING (public.is_store_admin_or_manager(loja_id));
CREATE POLICY ocorrencias_self_view ON public.operacao_ocorrencias FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY ocorrencias_self_insert ON public.operacao_ocorrencias FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY ocorrencias_admin_manage ON public.operacao_ocorrencias FOR ALL USING (public.is_store_admin_or_manager(loja_id));

-- Trigger for updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON public.operacao_checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        CREATE TRIGGER update_ocorrencias_updated_at BEFORE UPDATE ON public.operacao_ocorrencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

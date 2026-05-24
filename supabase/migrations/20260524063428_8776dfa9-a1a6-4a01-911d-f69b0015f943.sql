-- Create rh_escalas table
CREATE TABLE IF NOT EXISTS public.rh_escalas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    funcionario_id UUID NOT NULL REFERENCES public.rh_funcionarios(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    intervalo_inicio TIME,
    intervalo_fim TIME,
    ativo BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create rh_disponibilidade_excecoes table
CREATE TABLE IF NOT EXISTS public.rh_disponibilidade_excecoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    funcionario_id UUID NOT NULL REFERENCES public.rh_funcionarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('indisponivel', 'disponivel_extra', 'bloqueio', 'treinamento', 'reuniao', 'outro')),
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ NOT NULL,
    motivo TEXT,
    origem TEXT,
    origem_id UUID,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rh_escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_disponibilidade_excecoes ENABLE ROW LEVEL SECURITY;

-- rh_escalas policies
CREATE POLICY rh_escalas_admin_view ON public.rh_escalas FOR SELECT USING (public.is_rh_admin_or_manager(loja_id));
CREATE POLICY rh_escalas_self_view ON public.rh_escalas FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rh_funcionarios WHERE id = funcionario_id AND user_id = auth.uid())
);
CREATE POLICY rh_escalas_admin_manage ON public.rh_escalas FOR ALL USING (public.is_rh_admin_or_manager(loja_id));

-- rh_disponibilidade_excecoes policies
CREATE POLICY rh_excecoes_admin_view ON public.rh_disponibilidade_excecoes FOR SELECT USING (public.is_rh_admin_or_manager(loja_id));
CREATE POLICY rh_excecoes_self_view ON public.rh_disponibilidade_excecoes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rh_funcionarios WHERE id = funcionario_id AND user_id = auth.uid())
);
CREATE POLICY rh_excecoes_admin_manage ON public.rh_disponibilidade_excecoes FOR ALL USING (public.is_rh_admin_or_manager(loja_id));

-- Function to calculate availability
CREATE OR REPLACE FUNCTION public.calcular_disponibilidade_funcionario(
    p_funcionario_id UUID,
    p_data_inicio TIMESTAMPTZ,
    p_data_fim TIMESTAMPTZ
) 
RETURNS JSONB AS $$
DECLARE
    v_status TEXT := 'disponivel';
    v_motivo TEXT := NULL;
    v_conflitos JSONB := '[]'::JSONB;
    v_dia_semana INTEGER;
    v_hora_inicio TIME;
    v_hora_fim TIME;
    v_em_escala BOOLEAN := FALSE;
    v_solicitacao RECORD;
    v_excecao RECORD;
BEGIN
    -- 1. Check if employee exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.rh_funcionarios WHERE id = p_funcionario_id AND status = 'ativo') THEN
        RETURN jsonb_build_object('status', 'inativo', 'motivo', 'Funcionário não está ativo');
    END IF;

    -- 2. Check Vacations/Leaves (rh_solicitacoes)
    SELECT tipo, status INTO v_solicitacao 
    FROM public.rh_solicitacoes 
    WHERE funcionario_id = p_funcionario_id 
      AND status = 'aprovada'
      AND (
        (data_inicio <= p_data_fim::DATE AND data_fim >= p_data_inicio::DATE)
      )
    LIMIT 1;

    IF v_solicitacao.tipo IS NOT NULL THEN
        RETURN jsonb_build_object('status', v_solicitacao.tipo, 'motivo', 'Possui solicitação aprovada: ' || v_solicitacao.tipo);
    END IF;

    -- 3. Check Manual Exceptions
    SELECT tipo, motivo INTO v_excecao
    FROM public.rh_disponibilidade_excecoes
    WHERE funcionario_id = p_funcionario_id
      AND (
        (data_inicio < p_data_fim AND data_fim > p_data_inicio)
      )
    LIMIT 1;

    IF v_excecao.tipo IS NOT NULL AND v_excecao.tipo != 'disponivel_extra' THEN
        RETURN jsonb_build_object('status', v_excecao.tipo, 'motivo', COALESCE(v_excecao.motivo, v_excecao.tipo));
    END IF;

    -- 4. Check Weekly Schedule (rh_escalas)
    v_dia_semana := extract(dow from p_data_inicio);
    v_hora_inicio := p_data_inicio::TIME;
    v_hora_fim := p_data_fim::TIME;

    SELECT TRUE INTO v_em_escala
    FROM public.rh_escalas
    WHERE funcionario_id = p_funcionario_id
      AND dia_semana = v_dia_semana
      AND ativo = TRUE
      AND hora_inicio <= v_hora_inicio
      AND hora_fim >= v_hora_fim;

    IF NOT v_em_escala AND v_excecao.tipo != 'disponivel_extra' THEN
        RETURN jsonb_build_object('status', 'fora_da_escala', 'motivo', 'Fora do horário de escala semanal');
    END IF;

    -- 5. Check other tasks (Optional/Simplified for now)
    -- This would require checking operational tables. For now we return available.

    RETURN jsonb_build_object('status', 'disponivel', 'motivo', NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updated_at on rh_escalas
CREATE TRIGGER update_rh_escalas_updated_at
BEFORE UPDATE ON public.rh_escalas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

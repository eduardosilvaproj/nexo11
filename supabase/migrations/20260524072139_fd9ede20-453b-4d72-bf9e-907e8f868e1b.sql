-- Create automation rules table
CREATE TABLE public.automacao_regras (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    gatilho TEXT NOT NULL,
    condicoes JSONB NOT NULL DEFAULT '{}'::jsonb,
    acoes JSONB NOT NULL DEFAULT '[]'::jsonb,
    delay_minutos INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create automation executions log table
CREATE TABLE public.automacao_execucoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    regra_id UUID REFERENCES public.automacao_regras(id) ON DELETE SET NULL,
    gatilho TEXT NOT NULL,
    entidade_tipo TEXT NOT NULL,
    entidade_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    resultado JSONB NOT NULL DEFAULT '{}'::jsonb,
    erro TEXT,
    executado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automacao_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automacao_execucoes ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for rules
CREATE TRIGGER tr_automacao_regras_updated_at
BEFORE UPDATE ON public.automacao_regras
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Policies for automacao_regras
CREATE POLICY "Users can view rules from their store"
ON public.automacao_regras
FOR SELECT
TO authenticated
USING (
    loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid())
    OR has_role(auth.uid(), 'franqueador')
);

CREATE POLICY "Managers can manage rules from their store"
ON public.automacao_regras
FOR ALL
TO authenticated
USING (
    (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid())
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente')))
    OR has_role(auth.uid(), 'franqueador')
)
WITH CHECK (
    (loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid())
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente')))
    OR has_role(auth.uid(), 'franqueador')
);

-- Policies for automacao_execucoes
CREATE POLICY "Users can view executions from their store"
ON public.automacao_execucoes
FOR SELECT
TO authenticated
USING (
    loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid())
    OR has_role(auth.uid(), 'franqueador')
);

-- Note: Executions are usually created by triggers or edge functions (system), 
-- but we allow authorized roles to view them.

-- Add help info for trigger types (as a comment/reference)
COMMENT ON COLUMN public.automacao_regras.gatilho IS 'Available triggers: contrato_criado, documento_pendente_assinatura, entrega_agendada, entrega_concluida, montagem_agendada, montagem_concluida, pos_venda_aberto, pos_venda_resolvido, nps_respondido, nps_detrator, sla_proximo_vencimento, sla_rompido, ocorrencia_critica, tarefa_sem_checkin, offline_sync_falhou';

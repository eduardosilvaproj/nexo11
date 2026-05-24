-- Create operacao_slas table
CREATE TABLE IF NOT EXISTS public.operacao_slas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    modulo TEXT NOT NULL, -- 'tecnico', 'logistica', 'montagem', 'pos_venda'
    tipo_tarefa TEXT,
    nome TEXT NOT NULL,
    prazo_horas INTEGER,
    prazo_dias INTEGER,
    exigir_evidencia BOOLEAN NOT NULL DEFAULT false,
    exigir_assinatura BOOLEAN NOT NULL DEFAULT false,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operacao_slas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY slas_admin_view ON public.operacao_slas FOR SELECT USING (public.is_store_admin_or_manager(loja_id));
CREATE POLICY slas_admin_manage ON public.operacao_slas FOR ALL USING (public.is_store_admin_or_manager(loja_id));

-- Trigger for updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_slas_updated_at BEFORE UPDATE ON public.operacao_slas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

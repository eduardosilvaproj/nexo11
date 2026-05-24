CREATE TABLE IF NOT EXISTS public.mobile_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    device_info JSONB,
    acao TEXT NOT NULL,
    tabela TEXT NOT NULL,
    status TEXT NOT NULL, -- 'sucesso', 'falha'
    erro TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mobile_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY sync_logs_admin_view ON public.mobile_sync_logs FOR SELECT USING (public.is_store_admin_or_manager(loja_id));
CREATE POLICY sync_logs_self_insert ON public.mobile_sync_logs FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- ============ Melhorias Produção: Volumes e Log de Status ============

-- 1. Tabela de volumes/pacotes por pedido de produção
CREATE TABLE IF NOT EXISTS public.producao_volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('terceirizada', 'interna')),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  numero TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_transito', 'entregue')),
  data_entrega TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.producao_volumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "producao_volumes_select" ON public.producao_volumes
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "producao_volumes_insert" ON public.producao_volumes
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "producao_volumes_update" ON public.producao_volumes
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "producao_volumes_delete" ON public.producao_volumes
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE INDEX IF NOT EXISTS idx_producao_volumes_pedido ON public.producao_volumes(pedido_id);
CREATE INDEX IF NOT EXISTS idx_producao_volumes_status ON public.producao_volumes(status);

-- 2. Tabela de log de mudanças de status
CREATE TABLE IF NOT EXISTS public.producao_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('terceirizada', 'interna')),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.producao_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "producao_log_select" ON public.producao_log
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "producao_log_insert" ON public.producao_log
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "producao_log_update" ON public.producao_log
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "producao_log_delete" ON public.producao_log
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE INDEX IF NOT EXISTS idx_producao_log_pedido ON public.producao_log(pedido_id);
CREATE INDEX IF NOT EXISTS idx_producao_log_created ON public.producao_log(created_at);

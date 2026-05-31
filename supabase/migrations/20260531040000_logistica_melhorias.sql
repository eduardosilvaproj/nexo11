-- Checklist de separação
CREATE TABLE IF NOT EXISTS public.logistica_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES public.entregas(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  items JSONB NOT NULL DEFAULT '[]',
  concluido BOOLEAN DEFAULT false,
  concluido_por UUID REFERENCES auth.users(id),
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistica_checklists_entrega_id
  ON public.logistica_checklists(entrega_id);

ALTER TABLE public.logistica_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logistica_checklists_select"
  ON public.logistica_checklists FOR SELECT
  USING (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
      AND perfis.role = 'franqueador'
    )
  );

CREATE POLICY "logistica_checklists_insert"
  ON public.logistica_checklists FOR INSERT
  WITH CHECK (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
      AND perfis.role = 'franqueador'
    )
  );

CREATE POLICY "logistica_checklists_update"
  ON public.logistica_checklists FOR UPDATE
  USING (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
      AND perfis.role = 'franqueador'
    )
  );

CREATE POLICY "logistica_checklists_delete"
  ON public.logistica_checklists FOR DELETE
  USING (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
      AND perfis.role = 'franqueador'
    )
  );

-- Log de notificações
CREATE TABLE IF NOT EXISTS public.logistica_notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES public.entregas(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('agendamento', 'a_caminho', 'entregue', 'reagendado')),
  destinatario TEXT,
  mensagem TEXT,
  enviado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistica_notificacoes_entrega_id
  ON public.logistica_notificacoes(entrega_id);

ALTER TABLE public.logistica_notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logistica_notificacoes_select"
  ON public.logistica_notificacoes FOR SELECT
  USING (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
      AND perfis.role = 'franqueador'
    )
  );

CREATE POLICY "logistica_notificacoes_insert"
  ON public.logistica_notificacoes FOR INSERT
  WITH CHECK (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
      AND perfis.role = 'franqueador'
    )
  );

CREATE POLICY "logistica_notificacoes_update"
  ON public.logistica_notificacoes FOR UPDATE
  USING (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
      AND perfis.role = 'franqueador'
    )
  );

CREATE POLICY "logistica_notificacoes_delete"
  ON public.logistica_notificacoes FOR DELETE
  USING (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
      AND perfis.role = 'franqueador'
    )
  );

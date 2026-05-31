-- Analytics: user dashboard preferences (optional, for server-side persistence)
CREATE TABLE IF NOT EXISTS public.analytics_preferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  widgets JSONB NOT NULL DEFAULT '[]',
  layout JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.analytics_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_prefs_own" ON public.analytics_preferencias
  FOR ALL TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_analytics_prefs_user ON public.analytics_preferencias(user_id);

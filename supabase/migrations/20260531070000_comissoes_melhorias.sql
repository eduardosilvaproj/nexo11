-- Regras avançadas de comissão (escalonamento, bônus por meta, split)
CREATE TABLE IF NOT EXISTS public.comissoes_regras_avancadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('escalonamento', 'bonus_meta', 'split')),
  config JSONB NOT NULL DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(loja_id, tipo)
);

-- Index on loja_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_comissoes_regras_avancadas_loja
  ON public.comissoes_regras_avancadas(loja_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_comissoes_regras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comissoes_regras_avancadas_updated_at
  ON public.comissoes_regras_avancadas;

CREATE TRIGGER trg_comissoes_regras_avancadas_updated_at
  BEFORE UPDATE ON public.comissoes_regras_avancadas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comissoes_regras_updated_at();

-- Enable RLS
ALTER TABLE public.comissoes_regras_avancadas ENABLE ROW LEVEL SECURITY;

-- Policy: franqueador or users from the same loja can read
CREATE POLICY "comissoes_regras_avancadas_select"
  ON public.comissoes_regras_avancadas
  FOR SELECT
  USING (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.pessoas p
      WHERE p.auth_user_id = auth.uid()
        AND (p.funcoes @> '["franqueador"]' OR p.funcoes @> '["admin"]')
    )
  );

-- Policy: franqueador or admin from the same loja can insert
CREATE POLICY "comissoes_regras_avancadas_insert"
  ON public.comissoes_regras_avancadas
  FOR INSERT
  WITH CHECK (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.pessoas p
      WHERE p.auth_user_id = auth.uid()
        AND (p.funcoes @> '["franqueador"]' OR p.funcoes @> '["admin"]')
    )
  );

-- Policy: franqueador or admin from the same loja can update
CREATE POLICY "comissoes_regras_avancadas_update"
  ON public.comissoes_regras_avancadas
  FOR UPDATE
  USING (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.pessoas p
      WHERE p.auth_user_id = auth.uid()
        AND (p.funcoes @> '["franqueador"]' OR p.funcoes @> '["admin"]')
    )
  )
  WITH CHECK (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.pessoas p
      WHERE p.auth_user_id = auth.uid()
        AND (p.funcoes @> '["franqueador"]' OR p.funcoes @> '["admin"]')
    )
  );

-- Policy: franqueador or admin can delete
CREATE POLICY "comissoes_regras_avancadas_delete"
  ON public.comissoes_regras_avancadas
  FOR DELETE
  USING (
    loja_id = current_setting('app.current_loja_id', true)::uuid
    OR EXISTS (
      SELECT 1 FROM public.pessoas p
      WHERE p.auth_user_id = auth.uid()
        AND (p.funcoes @> '["franqueador"]' OR p.funcoes @> '["admin"]')
    )
  );

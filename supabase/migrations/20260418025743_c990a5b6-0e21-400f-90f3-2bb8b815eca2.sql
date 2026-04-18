-- Create integracoes table to store per-store external integration configs (e.g., Promob)
CREATE TABLE IF NOT EXISTS public.integracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultima_sincronizacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (loja_id, tipo)
);

ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;

-- Only admin or gerente of the store can manage integrations (credentials are sensitive)
CREATE POLICY "Admins/gerentes podem ver integrações da loja"
ON public.integracoes
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gerente'::app_role, loja_id)
);

CREATE POLICY "Admins/gerentes podem criar integrações da loja"
ON public.integracoes
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gerente'::app_role, loja_id)
);

CREATE POLICY "Admins/gerentes podem atualizar integrações da loja"
ON public.integracoes
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gerente'::app_role, loja_id)
);

CREATE POLICY "Admins/gerentes podem remover integrações da loja"
ON public.integracoes
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gerente'::app_role, loja_id)
);

CREATE TRIGGER set_integracoes_updated_at
BEFORE UPDATE ON public.integracoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_integracoes_loja_tipo ON public.integracoes(loja_id, tipo);
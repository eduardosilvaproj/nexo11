-- 1. Tabela fornecedores
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  contato text,
  telefone text,
  email text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fornecedores_loja ON public.fornecedores(loja_id);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedores visíveis pela loja"
ON public.fornecedores FOR SELECT TO authenticated
USING (
  loja_id = public.current_loja_id()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'franqueador'::app_role)
);

CREATE POLICY "Fornecedores: insert por gerente/admin"
ON public.fornecedores FOR INSERT TO authenticated
WITH CHECK (
  loja_id = public.current_loja_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
  )
);

CREATE POLICY "Fornecedores: update por gerente/admin"
ON public.fornecedores FOR UPDATE TO authenticated
USING (
  loja_id = public.current_loja_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
  )
)
WITH CHECK (
  loja_id = public.current_loja_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
  )
);

CREATE POLICY "Fornecedores: delete por admin"
ON public.fornecedores FOR DELETE TO authenticated
USING (
  loja_id = public.current_loja_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE TRIGGER trg_fornecedores_updated_at
BEFORE UPDATE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Ajustes em ordens_producao
ALTER TABLE public.ordens_producao
  ADD COLUMN fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN observacoes text,
  ADD COLUMN prazo_dias integer;

CREATE INDEX idx_ordens_producao_contrato ON public.ordens_producao(contrato_id);
CREATE INDEX idx_ordens_producao_fornecedor ON public.ordens_producao(fornecedor_id);

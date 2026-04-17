
-- regras_comissao
CREATE TABLE public.regras_comissao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  percentual_base numeric(5,2) NOT NULL DEFAULT 3.0,
  margem_min_bonus numeric(5,2) NOT NULL DEFAULT 30.0,
  percentual_bonus numeric(5,2) NOT NULL DEFAULT 0.5,
  bonus_ativo boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX regras_comissao_loja_ativa_uniq
  ON public.regras_comissao(loja_id) WHERE ativo;

ALTER TABLE public.regras_comissao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Regras visíveis por gerente/admin/franqueador"
  ON public.regras_comissao FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
      OR public.has_role(auth.uid(), 'vendedor'::app_role)
    ))
  );

CREATE POLICY "Regras insert admin/gerente"
  ON public.regras_comissao FOR INSERT TO authenticated
  WITH CHECK (
    loja_id = public.current_loja_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'gerente'::app_role))
  );

CREATE POLICY "Regras update admin/gerente"
  ON public.regras_comissao FOR UPDATE TO authenticated
  USING (
    loja_id = public.current_loja_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'gerente'::app_role))
  )
  WITH CHECK (
    loja_id = public.current_loja_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'gerente'::app_role))
  );

CREATE POLICY "Regras delete admin"
  ON public.regras_comissao FOR DELETE TO authenticated
  USING (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_regras_comissao_updated
  BEFORE UPDATE ON public.regras_comissao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- comissoes
CREATE TABLE public.comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL,
  valor_base numeric(14,2) NOT NULL DEFAULT 0,
  valor_bonus numeric(14,2) NOT NULL DEFAULT 0,
  margem_realizada_pct numeric(6,2) NOT NULL DEFAULT 0,
  pago boolean NOT NULL DEFAULT false,
  data_pagamento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comissoes_loja_idx ON public.comissoes(loja_id, created_at);
CREATE INDEX comissoes_vendedor_idx ON public.comissoes(vendedor_id, created_at);
CREATE UNIQUE INDEX comissoes_contrato_uniq ON public.comissoes(contrato_id);

ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comissoes visíveis por papel"
  ON public.comissoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = public.current_loja_id() AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
      OR vendedor_id = auth.uid()
    ))
  );

CREATE POLICY "Comissoes insert admin/gerente"
  ON public.comissoes FOR INSERT TO authenticated
  WITH CHECK (
    loja_id = public.current_loja_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'gerente'::app_role))
  );

CREATE POLICY "Comissoes update admin/gerente"
  ON public.comissoes FOR UPDATE TO authenticated
  USING (
    loja_id = public.current_loja_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'gerente'::app_role))
  )
  WITH CHECK (
    loja_id = public.current_loja_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'gerente'::app_role))
  );

CREATE POLICY "Comissoes delete admin"
  ON public.comissoes FOR DELETE TO authenticated
  USING (loja_id = public.current_loja_id() AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_comissoes_updated
  BEFORE UPDATE ON public.comissoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default rule for each existing store
INSERT INTO public.regras_comissao (loja_id)
SELECT id FROM public.lojas
ON CONFLICT DO NOTHING;

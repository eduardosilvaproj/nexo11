CREATE TABLE public.custos_fixos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_custos_fixos_loja_mes ON public.custos_fixos(loja_id, mes_referencia);

ALTER TABLE public.custos_fixos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custos fixos visíveis pela loja"
ON public.custos_fixos FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
  ))
);

CREATE POLICY "Custos fixos insert por admin/gerente"
ON public.custos_fixos FOR INSERT TO authenticated
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Custos fixos update por admin/gerente"
ON public.custos_fixos FOR UPDATE TO authenticated
USING (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
)
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Custos fixos delete por admin/gerente"
ON public.custos_fixos FOR DELETE TO authenticated
USING (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE TRIGGER trg_custos_fixos_updated
BEFORE UPDATE ON public.custos_fixos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.custos_fixos (loja_id, mes_referencia, descricao, valor)
SELECT l.id, date_trunc('month', now())::date, x.descricao, x.valor
FROM public.lojas l
CROSS JOIN (VALUES
  ('Folha de pagamento', 28400),
  ('Aluguel e condomínio', 7200),
  ('Marketing', 4800),
  ('Sistemas e tecnologia', 1200),
  ('Outros fixos', 6400)
) AS x(descricao, valor);
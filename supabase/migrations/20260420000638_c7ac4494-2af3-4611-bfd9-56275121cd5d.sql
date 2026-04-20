
-- 1) Substituir tabela comissoes pelo novo schema
DROP TABLE IF EXISTS public.comissoes CASCADE;

CREATE TABLE public.comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  ambiente_id uuid NULL REFERENCES public.contrato_ambientes(id) ON DELETE SET NULL,
  usuario_id uuid NOT NULL,
  papel_id uuid NOT NULL REFERENCES public.papeis_comissao(id) ON DELETE RESTRICT,
  base_calculo numeric(14,2) NOT NULL DEFAULT 0,
  percentual numeric(6,3) NOT NULL DEFAULT 0,
  valor numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','liberada','paga','cancelada')),
  gatilho text NULL,
  data_gatilho timestamptz NULL,
  data_pagamento date NULL,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comissoes_loja ON public.comissoes(loja_id);
CREATE INDEX idx_comissoes_contrato ON public.comissoes(contrato_id);
CREATE INDEX idx_comissoes_usuario ON public.comissoes(usuario_id);
CREATE INDEX idx_comissoes_status ON public.comissoes(loja_id, status);

DROP TRIGGER IF EXISTS trg_comissoes_updated_at ON public.comissoes;
CREATE TRIGGER trg_comissoes_updated_at
BEFORE UPDATE ON public.comissoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comissoes visíveis por papel"
ON public.comissoes FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR usuario_id = auth.uid()
  ))
);

CREATE POLICY "Comissoes insert por admin/gerente"
ON public.comissoes FOR INSERT TO authenticated
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Comissoes update por admin/gerente"
ON public.comissoes FOR UPDATE TO authenticated
USING (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
)
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Comissoes delete por admin"
ON public.comissoes FOR DELETE TO authenticated
USING (
  loja_id = current_loja_id() AND has_role(auth.uid(), 'admin'::app_role)
);

-- 2) Seed dos 7 papéis padrão por loja (idempotente)
INSERT INTO public.papeis_comissao (loja_id, nome, tipo, percentual_padrao, regra_pagamento)
SELECT l.id, v.nome, v.tipo::public.papel_comissao_tipo, v.pct, v.regra::public.papel_comissao_regra
FROM public.lojas l
CROSS JOIN (VALUES
  ('Vendedor',              'vendedor',              3.0, 'contrato_assinado'),
  ('Projetista',            'projetista',            1.0, 'contrato_assinado'),
  ('Vendedor + Projetista', 'vendedor_projetista',   4.0, 'contrato_assinado'),
  ('Gerente Comercial',     'gerente_comercial',     1.0, 'contrato_assinado'),
  ('Gerente Operacional',   'gerente_operacional',   0.5, 'por_ambiente_tecnico'),
  ('Gerente de Montagem',   'gerente_montagem',      0.5, 'por_ambiente_montagem')
) AS v(nome, tipo, pct, regra)
WHERE NOT EXISTS (
  SELECT 1 FROM public.papeis_comissao p
  WHERE p.loja_id = l.id AND p.tipo = v.tipo::public.papel_comissao_tipo
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_templates_loja ON public.checklist_templates(loja_id, ordem);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates visíveis por loja"
ON public.checklist_templates FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id = current_loja_id() AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
  ))
);

CREATE POLICY "Templates insert por admin/gerente"
ON public.checklist_templates FOR INSERT TO authenticated
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Templates update por admin/gerente"
ON public.checklist_templates FOR UPDATE TO authenticated
USING (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
)
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Templates delete por admin/gerente"
ON public.checklist_templates FOR DELETE TO authenticated
USING (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE TRIGGER trg_checklist_templates_updated_at
BEFORE UPDATE ON public.checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.checklist_templates (loja_id, descricao, obrigatorio, ordem)
SELECT l.id, item.descricao, true, item.ordem
FROM public.lojas l
CROSS JOIN (VALUES
  ('Projeto aprovado pelo cliente', 1),
  ('Medidas conferidas in loco', 2),
  ('Pontos elétricos e hidráulicos ok', 3),
  ('Material especificado e disponível', 4),
  ('Prazo confirmado com cliente', 5),
  ('Laudo técnico assinado', 6)
) AS item(descricao, ordem);
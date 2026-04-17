
-- 1. Add tipo column to checklist_templates
ALTER TABLE public.checklist_templates
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'conferencia'
  CHECK (tipo IN ('medicao', 'conferencia'));

-- 2. Mark all existing items as 'conferencia' (default already does that)
UPDATE public.checklist_templates SET tipo = 'conferencia' WHERE tipo IS NULL;

-- 3. Seed 8 medição items for every loja that doesn't have them yet
INSERT INTO public.checklist_templates (loja_id, descricao, tipo, ordem, obrigatorio, ativo)
SELECT l.id, item.descricao, 'medicao', item.ordem, true, true
FROM public.lojas l
CROSS JOIN (VALUES
  ('Acesso ao imóvel confirmado', 1),
  ('Planta baixa disponível', 2),
  ('Todas as paredes medidas', 3),
  ('Pontos elétricos mapeados', 4),
  ('Pontos hidráulicos mapeados', 5),
  ('Fotografias realizadas', 6),
  ('Pé-direito e vãos conferidos', 7),
  ('Medição assinada pelo cliente', 8)
) AS item(descricao, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.checklist_templates ct
  WHERE ct.loja_id = l.id AND ct.tipo = 'medicao' AND ct.descricao = item.descricao
);

-- 4. Index for ordering
CREATE INDEX IF NOT EXISTS idx_checklist_templates_loja_tipo
  ON public.checklist_templates(loja_id, tipo, ordem);

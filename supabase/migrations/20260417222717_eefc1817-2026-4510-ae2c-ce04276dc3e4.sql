ALTER TABLE public.checklist_templates
ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_checklist_templates_loja_ativo
ON public.checklist_templates(loja_id, ativo, ordem);
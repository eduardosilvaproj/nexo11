-- Add new columns to contrato_ambientes table
ALTER TABLE public.contrato_ambientes 
ADD COLUMN IF NOT EXISTS observacoes_conferencia TEXT,
ADD COLUMN IF NOT EXISTS inclui_ferragens BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checklist_json JSONB DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.contrato_ambientes.observacoes_conferencia IS 'Notas detalhadas do conferente técnico';
COMMENT ON COLUMN public.contrato_ambientes.inclui_ferragens IS 'Indica se o XML de conferência inclui o custo das ferragens';
COMMENT ON COLUMN public.contrato_ambientes.checklist_json IS 'Estado dos itens do checklist técnico';
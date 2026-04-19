-- Rename table
ALTER TABLE public.montadores RENAME TO tecnicos_montadores;

-- Add funcoes array column
ALTER TABLE public.tecnicos_montadores
  ADD COLUMN IF NOT EXISTS funcoes text[] NOT NULL DEFAULT '{}';

-- Backfill: existing rows are montadores
UPDATE public.tecnicos_montadores
   SET funcoes = ARRAY['montador']
 WHERE funcoes = '{}' OR funcoes IS NULL;

-- Drop old policies (they reference old table name in their own name only; recreate cleanly)
DROP POLICY IF EXISTS "Montadores delete por admin" ON public.tecnicos_montadores;
DROP POLICY IF EXISTS "Montadores insert por admin/gerente" ON public.tecnicos_montadores;
DROP POLICY IF EXISTS "Montadores update por admin/gerente" ON public.tecnicos_montadores;
DROP POLICY IF EXISTS "Montadores visíveis por admin/gerente da loja" ON public.tecnicos_montadores;

-- Recreate policies with new naming
CREATE POLICY "Tecnicos montadores delete por admin"
ON public.tecnicos_montadores FOR DELETE TO authenticated
USING ((loja_id = current_loja_id()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tecnicos montadores insert por admin/gerente"
ON public.tecnicos_montadores FOR INSERT TO authenticated
WITH CHECK ((loja_id = current_loja_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role)));

CREATE POLICY "Tecnicos montadores update por admin/gerente"
ON public.tecnicos_montadores FOR UPDATE TO authenticated
USING ((loja_id = current_loja_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role)))
WITH CHECK ((loja_id = current_loja_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role)));

CREATE POLICY "Tecnicos montadores visiveis por admin/gerente da loja"
ON public.tecnicos_montadores FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'franqueador'::app_role) OR ((loja_id = current_loja_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role) OR has_role(auth.uid(), 'tecnico'::app_role) OR has_role(auth.uid(), 'montador'::app_role))));
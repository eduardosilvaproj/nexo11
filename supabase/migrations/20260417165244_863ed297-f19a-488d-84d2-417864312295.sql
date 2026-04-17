
-- 1) has_role: enforce loja_id when provided (no more "OR loja_id IS NULL" bypass)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _loja_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        _loja_id IS NULL
        OR loja_id = _loja_id
        OR role IN ('admin'::app_role, 'franqueador'::app_role)
      )
  )
$function$;

-- 2) usuarios: hide emails from regular store members
-- Create a safe public view (no email) and restrict base table SELECT to privileged users
CREATE OR REPLACE VIEW public.usuarios_publico
WITH (security_invoker=on) AS
  SELECT id, nome, loja_id, created_at, updated_at
  FROM public.usuarios;

GRANT SELECT ON public.usuarios_publico TO authenticated;

DROP POLICY IF EXISTS "Vê próprios dados ou da loja" ON public.usuarios;

CREATE POLICY "Usuario vê próprios dados completos"
  ON public.usuarios FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = current_loja_id() AND has_role(auth.uid(), 'gerente'::app_role))
  );

-- 3) dre_contrato: restrict to financial roles only
DROP POLICY IF EXISTS "DRE segue contrato (select)" ON public.dre_contrato;

CREATE POLICY "DRE visível para papéis financeiros"
  ON public.dre_contrato FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      contrato_da_loja(contrato_id)
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gerente'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.contratos c
          WHERE c.id = dre_contrato.contrato_id
            AND c.vendedor_id = auth.uid()
        )
      )
    )
  );

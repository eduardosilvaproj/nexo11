-- Allow admin/gerente of the same loja to update ponto records
CREATE POLICY "Ponto: admin/gerente atualizam registros da loja"
ON public.registros_ponto
FOR UPDATE
TO authenticated
USING (
  (loja_id = current_loja_id())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
)
WITH CHECK (
  (loja_id = current_loja_id())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

-- Audit table for ponto adjustments
CREATE TABLE public.registros_ponto_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL REFERENCES public.registros_ponto(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  loja_id uuid NOT NULL,
  ajustado_por uuid NOT NULL,
  ajustado_por_nome text,
  valor_anterior timestamptz NOT NULL,
  valor_novo timestamptz NOT NULL,
  motivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registros_ponto_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit ponto: visível para admin/gerente da loja ou franqueador"
ON public.registros_ponto_audit
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    loja_id = current_loja_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  )
  OR usuario_id = auth.uid()
);

CREATE POLICY "Audit ponto: insert pelo próprio ajustador (admin/gerente)"
ON public.registros_ponto_audit
FOR INSERT
TO authenticated
WITH CHECK (
  ajustado_por = auth.uid()
  AND loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE INDEX idx_registros_ponto_audit_registro ON public.registros_ponto_audit(registro_id);
CREATE INDEX idx_registros_ponto_audit_usuario ON public.registros_ponto_audit(usuario_id);
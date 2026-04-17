-- Time-clock entries
CREATE TYPE public.ponto_tipo AS ENUM ('entrada', 'saida');

CREATE TABLE public.registros_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo public.ponto_tipo NOT NULL,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_registros_ponto_user_data
  ON public.registros_ponto (usuario_id, registrado_em DESC);
CREATE INDEX idx_registros_ponto_loja_data
  ON public.registros_ponto (loja_id, registrado_em DESC);

ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;

-- Users can see their own punches; admin/gerente see store; franqueador sees all
CREATE POLICY "Ponto: ver próprios ou da loja (admin/gerente) ou franqueador"
ON public.registros_ponto
FOR SELECT
TO authenticated
USING (
  usuario_id = auth.uid()
  OR has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    loja_id = current_loja_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  )
);

-- Users punch only for themselves and only into their own store
CREATE POLICY "Ponto: registrar próprio ponto na própria loja"
ON public.registros_ponto
FOR INSERT
TO authenticated
WITH CHECK (
  usuario_id = auth.uid()
  AND loja_id = current_loja_id()
);

-- Only admin can fix mistakes (delete) within the store
CREATE POLICY "Ponto: admin apaga registros da loja"
ON public.registros_ponto
FOR DELETE
TO authenticated
USING (
  loja_id = current_loja_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

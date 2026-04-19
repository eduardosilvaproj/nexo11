-- Enums
CREATE TYPE public.producao_interna_status AS ENUM ('a_fazer', 'em_andamento', 'aguardando_material', 'concluido');
CREATE TYPE public.producao_interna_prioridade AS ENUM ('normal', 'urgente');

-- Tabela
CREATE TABLE public.producao_interna (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  cliente_nome text NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  descricao text,
  status public.producao_interna_status NOT NULL DEFAULT 'a_fazer',
  data_prevista date,
  prioridade public.producao_interna_prioridade NOT NULL DEFAULT 'normal',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_producao_interna_loja ON public.producao_interna(loja_id);
CREATE INDEX idx_producao_interna_status ON public.producao_interna(status);
CREATE INDEX idx_producao_interna_fornecedor ON public.producao_interna(fornecedor_id);

ALTER TABLE public.producao_interna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producao interna visível por papéis"
  ON public.producao_interna FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'tecnico'::app_role)
    ))
  );

CREATE POLICY "Producao interna insert por admin/gerente/tecnico"
  ON public.producao_interna FOR INSERT
  TO authenticated
  WITH CHECK (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'tecnico'::app_role)
    )
  );

CREATE POLICY "Producao interna update por admin/gerente/tecnico"
  ON public.producao_interna FOR UPDATE
  TO authenticated
  USING (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'tecnico'::app_role)
    )
  )
  WITH CHECK (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'tecnico'::app_role)
    )
  );

CREATE POLICY "Producao interna delete por admin/gerente"
  ON public.producao_interna FOR DELETE
  TO authenticated
  USING (
    loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

CREATE TRIGGER trg_producao_interna_updated_at
  BEFORE UPDATE ON public.producao_interna
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
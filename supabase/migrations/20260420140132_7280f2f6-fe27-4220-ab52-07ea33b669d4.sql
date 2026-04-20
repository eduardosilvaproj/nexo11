
-- 1) Novas colunas em contrato_ambientes
ALTER TABLE public.contrato_ambientes
  ADD COLUMN IF NOT EXISTS custo_original numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_conferencia numeric(14,2),
  ADD COLUMN IF NOT EXISTS variacao_pct numeric(6,2),
  ADD COLUMN IF NOT EXISTS conferencia_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS conferencia_xml_raw text,
  ADD COLUMN IF NOT EXISTS conferencia_aprovada_por uuid,
  ADD COLUMN IF NOT EXISTS conferencia_aprovada_em timestamptz,
  ADD COLUMN IF NOT EXISTS itens_original_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS itens_conferencia_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS aprovacao_solicitada_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovacao_solicitada_por uuid;

ALTER TABLE public.contrato_ambientes
  DROP CONSTRAINT IF EXISTS contrato_ambientes_conferencia_status_chk;

ALTER TABLE public.contrato_ambientes
  ADD CONSTRAINT contrato_ambientes_conferencia_status_chk
  CHECK (conferencia_status IN ('pendente','aprovada','bloqueada','liberada'));

-- 2) Tabela de itens extras por ambiente
CREATE TABLE IF NOT EXISTS public.ambiente_itens_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente_id uuid NOT NULL REFERENCES public.contrato_ambientes(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL,
  loja_id uuid NOT NULL,
  descricao text NOT NULL,
  quantidade numeric(14,3) NOT NULL DEFAULT 1,
  unidade text,
  origem text NOT NULL DEFAULT 'comprar',
  status_compra text NOT NULL DEFAULT 'pendente',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ambiente_itens_extras_origem_chk CHECK (origem IN ('comprar','almoxarifado')),
  CONSTRAINT ambiente_itens_extras_status_chk CHECK (status_compra IN ('pendente','enviado_compras','recebido','cancelado'))
);

CREATE INDEX IF NOT EXISTS idx_ambiente_itens_extras_ambiente ON public.ambiente_itens_extras(ambiente_id);
CREATE INDEX IF NOT EXISTS idx_ambiente_itens_extras_contrato ON public.ambiente_itens_extras(contrato_id);

ALTER TABLE public.ambiente_itens_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Itens extras select" ON public.ambiente_itens_extras;
CREATE POLICY "Itens extras select"
  ON public.ambiente_itens_extras FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      public.contrato_da_loja(contrato_id)
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'gerente'::app_role)
        OR public.has_role(auth.uid(), 'tecnico'::app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Itens extras insert" ON public.ambiente_itens_extras;
CREATE POLICY "Itens extras insert"
  ON public.ambiente_itens_extras FOR INSERT TO authenticated
  WITH CHECK (
    public.contrato_da_loja(contrato_id)
    AND loja_id = public.current_loja_id()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
      OR public.has_role(auth.uid(), 'tecnico'::app_role)
    )
  );

DROP POLICY IF EXISTS "Itens extras update" ON public.ambiente_itens_extras;
CREATE POLICY "Itens extras update"
  ON public.ambiente_itens_extras FOR UPDATE TO authenticated
  USING (
    public.contrato_da_loja(contrato_id)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
      OR public.has_role(auth.uid(), 'tecnico'::app_role)
    )
  )
  WITH CHECK (
    public.contrato_da_loja(contrato_id)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
      OR public.has_role(auth.uid(), 'tecnico'::app_role)
    )
  );

DROP POLICY IF EXISTS "Itens extras delete" ON public.ambiente_itens_extras;
CREATE POLICY "Itens extras delete"
  ON public.ambiente_itens_extras FOR DELETE TO authenticated
  USING (
    public.contrato_da_loja(contrato_id)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
    )
  );

CREATE TRIGGER ambiente_itens_extras_set_updated
  BEFORE UPDATE ON public.ambiente_itens_extras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Tabela requisicoes_compra
CREATE TABLE IF NOT EXISTS public.requisicoes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL,
  contrato_id uuid NOT NULL,
  ambiente_id uuid REFERENCES public.contrato_ambientes(id) ON DELETE SET NULL,
  itens_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'aberta',
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT requisicoes_compra_status_chk CHECK (status IN ('aberta','em_cotacao','aprovada','recebida','cancelada'))
);

CREATE INDEX IF NOT EXISTS idx_requisicoes_compra_contrato ON public.requisicoes_compra(contrato_id);
CREATE INDEX IF NOT EXISTS idx_requisicoes_compra_loja ON public.requisicoes_compra(loja_id);

ALTER TABLE public.requisicoes_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requisicoes select" ON public.requisicoes_compra;
CREATE POLICY "Requisicoes select"
  ON public.requisicoes_compra FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      loja_id = public.current_loja_id()
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'gerente'::app_role)
        OR public.has_role(auth.uid(), 'tecnico'::app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Requisicoes insert" ON public.requisicoes_compra;
CREATE POLICY "Requisicoes insert"
  ON public.requisicoes_compra FOR INSERT TO authenticated
  WITH CHECK (
    loja_id = public.current_loja_id()
    AND public.contrato_da_loja(contrato_id)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
      OR public.has_role(auth.uid(), 'tecnico'::app_role)
    )
  );

DROP POLICY IF EXISTS "Requisicoes update" ON public.requisicoes_compra;
CREATE POLICY "Requisicoes update"
  ON public.requisicoes_compra FOR UPDATE TO authenticated
  USING (
    loja_id = public.current_loja_id()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
    )
  )
  WITH CHECK (
    loja_id = public.current_loja_id()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
    )
  );

DROP POLICY IF EXISTS "Requisicoes delete" ON public.requisicoes_compra;
CREATE POLICY "Requisicoes delete"
  ON public.requisicoes_compra FOR DELETE TO authenticated
  USING (
    loja_id = public.current_loja_id()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER requisicoes_compra_set_updated
  BEFORE UPDATE ON public.requisicoes_compra
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Função para aprovar conferência (gerente/admin) mesmo com variação > 10%
CREATE OR REPLACE FUNCTION public.aprovar_conferencia_ambiente(_ambiente_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _amb record;
  _uid uuid := auth.uid();
BEGIN
  SELECT id, contrato_id, loja_id, conferencia_status
    INTO _amb FROM public.contrato_ambientes WHERE id = _ambiente_id;

  IF _amb.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Ambiente não encontrado');
  END IF;

  IF NOT (
    public.has_role(_uid, 'admin'::app_role)
    OR public.has_role(_uid, 'gerente'::app_role, _amb.loja_id)
    OR public.has_role(_uid, 'gerente'::app_role)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Apenas gerente ou admin podem aprovar');
  END IF;

  UPDATE public.contrato_ambientes
     SET conferencia_status = 'aprovada',
         conferencia_aprovada_por = _uid,
         conferencia_aprovada_em = now()
   WHERE id = _ambiente_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 5) Trigger: notificar gerentes/admin da loja quando aprovação for solicitada
CREATE OR REPLACE FUNCTION public.trg_notif_aprovacao_conferencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.aprovacao_solicitada_em IS NOT NULL
     AND OLD.aprovacao_solicitada_em IS DISTINCT FROM NEW.aprovacao_solicitada_em THEN

    SELECT cliente_nome INTO c FROM public.contratos WHERE id = NEW.contrato_id;

    INSERT INTO public.notificacoes (user_id, contrato_id, tipo, mensagem, link)
    SELECT ur.user_id,
           NEW.contrato_id,
           'aprovacao_conferencia',
           format('Aprovação solicitada — ambiente "%s" (variação %s%%)',
                  NEW.nome, COALESCE(NEW.variacao_pct, 0)),
           '/contratos/' || NEW.contrato_id
      FROM public.user_roles ur
      JOIN public.usuarios u ON u.id = ur.user_id
     WHERE ur.role IN ('admin'::app_role, 'gerente'::app_role)
       AND u.loja_id = NEW.loja_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_aprovacao_conferencia ON public.contrato_ambientes;
CREATE TRIGGER trg_notif_aprovacao_conferencia
  AFTER UPDATE ON public.contrato_ambientes
  FOR EACH ROW EXECUTE FUNCTION public.trg_notif_aprovacao_conferencia();

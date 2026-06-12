
-- 1. Caixas previstas
CREATE TABLE IF NOT EXISTS public.caixas_previstas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producao_terceirizada_id uuid REFERENCES public.producao_terceirizada(id) ON DELETE SET NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  numero_pedido text NOT NULL,
  oc text,
  volume int NOT NULL,
  codigo_barras text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','recebida','avariada')),
  importado_em timestamptz NOT NULL DEFAULT now(),
  recebido_em timestamptz,
  recebido_por text,
  UNIQUE (loja_id, codigo_barras)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixas_previstas TO authenticated;
GRANT ALL ON public.caixas_previstas TO service_role;
CREATE INDEX IF NOT EXISTS idx_caixas_previstas_pedido ON public.caixas_previstas(loja_id, numero_pedido);
CREATE INDEX IF NOT EXISTS idx_caixas_previstas_producao ON public.caixas_previstas(producao_terceirizada_id);

-- 2. Recebimentos
CREATE TABLE IF NOT EXISTS public.recebimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid NOT NULL REFERENCES public.caixas_previstas(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  bipado_em timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid REFERENCES auth.users(id),
  usuario_nome text,
  bipado_via text CHECK (bipado_via IN ('input','camera'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimentos TO authenticated;
GRANT ALL ON public.recebimentos TO service_role;
CREATE INDEX IF NOT EXISTS idx_recebimentos_caixa ON public.recebimentos(caixa_id);

-- 3. Fotos do recebimento
CREATE TABLE IF NOT EXISTS public.recebimento_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producao_terceirizada_id uuid NOT NULL REFERENCES public.producao_terceirizada(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  tipo_evento text NOT NULL DEFAULT 'pedido'
    CHECK (tipo_evento IN ('pedido','avaria','montagem','outro')),
  descricao text,
  uploaded_em timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_by_nome text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_fotos TO authenticated;
GRANT ALL ON public.recebimento_fotos TO service_role;
CREATE INDEX IF NOT EXISTS idx_recebimento_fotos_pedido ON public.recebimento_fotos(producao_terceirizada_id);

-- 4. Novos campos em producao_terceirizada
ALTER TABLE public.producao_terceirizada
  ADD COLUMN IF NOT EXISTS status_recebimento text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (status_recebimento IN ('nao_iniciado','em_recebimento','recebido_deposito','recebido_cliente','entrega_finalizada')),
  ADD COLUMN IF NOT EXISTS destino_recebimento text CHECK (destino_recebimento IN ('deposito','cliente')),
  ADD COLUMN IF NOT EXISTS recebido_em timestamptz,
  ADD COLUMN IF NOT EXISTS recebido_por text,
  ADD COLUMN IF NOT EXISTS entregue_para text,
  ADD COLUMN IF NOT EXISTS total_caixas_previstas int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_caixas_recebidas int NOT NULL DEFAULT 0;

-- 5. RLS
ALTER TABLE public.caixas_previstas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimento_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "caixas_previstas_select" ON public.caixas_previstas FOR SELECT TO authenticated
  USING (public.is_admin_master() OR loja_id = public.current_loja_id());
CREATE POLICY "caixas_previstas_insert" ON public.caixas_previstas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_master() OR loja_id = public.current_loja_id());
CREATE POLICY "caixas_previstas_update" ON public.caixas_previstas FOR UPDATE TO authenticated
  USING (public.is_admin_master() OR loja_id = public.current_loja_id());
CREATE POLICY "caixas_previstas_delete" ON public.caixas_previstas FOR DELETE TO authenticated
  USING (public.is_admin_master() OR loja_id = public.current_loja_id());

CREATE POLICY "recebimentos_select" ON public.recebimentos FOR SELECT TO authenticated
  USING (public.is_admin_master() OR loja_id = public.current_loja_id());
CREATE POLICY "recebimentos_insert" ON public.recebimentos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_master() OR loja_id = public.current_loja_id());

CREATE POLICY "recebimento_fotos_select" ON public.recebimento_fotos FOR SELECT TO authenticated
  USING (public.is_admin_master() OR loja_id = public.current_loja_id());
CREATE POLICY "recebimento_fotos_insert" ON public.recebimento_fotos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_master() OR loja_id = public.current_loja_id());
CREATE POLICY "recebimento_fotos_delete" ON public.recebimento_fotos FOR DELETE TO authenticated
  USING (public.is_admin_master() OR loja_id = public.current_loja_id());

-- 6. Trigger contadores
CREATE OR REPLACE FUNCTION public.atualizar_contadores_caixas()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pedido_id uuid;
  v_total int;
  v_recebidas int;
BEGIN
  v_pedido_id := COALESCE(NEW.producao_terceirizada_id, OLD.producao_terceirizada_id);
  IF v_pedido_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'recebida')
    INTO v_total, v_recebidas
  FROM public.caixas_previstas
  WHERE producao_terceirizada_id = v_pedido_id;
  UPDATE public.producao_terceirizada
  SET total_caixas_previstas = v_total,
      total_caixas_recebidas = v_recebidas,
      updated_at = now()
  WHERE id = v_pedido_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_contadores_caixas ON public.caixas_previstas;
CREATE TRIGGER trg_atualizar_contadores_caixas
  AFTER INSERT OR UPDATE OR DELETE ON public.caixas_previstas
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_contadores_caixas();

-- 7. Storage policies (bucket 'recebimentos' já criado)
DROP POLICY IF EXISTS "recebimentos_storage_select" ON storage.objects;
CREATE POLICY "recebimentos_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'recebimentos' AND (public.is_admin_master() OR (storage.foldername(name))[1]::uuid = public.current_loja_id()));

DROP POLICY IF EXISTS "recebimentos_storage_insert" ON storage.objects;
CREATE POLICY "recebimentos_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recebimentos' AND (public.is_admin_master() OR (storage.foldername(name))[1]::uuid = public.current_loja_id()));

DROP POLICY IF EXISTS "recebimentos_storage_update" ON storage.objects;
CREATE POLICY "recebimentos_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'recebimentos' AND (public.is_admin_master() OR (storage.foldername(name))[1]::uuid = public.current_loja_id()));

DROP POLICY IF EXISTS "recebimentos_storage_delete" ON storage.objects;
CREATE POLICY "recebimentos_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'recebimentos' AND (public.is_admin_master() OR (storage.foldername(name))[1]::uuid = public.current_loja_id()));

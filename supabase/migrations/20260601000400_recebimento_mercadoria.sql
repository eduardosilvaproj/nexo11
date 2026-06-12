-- =========================================================
-- MIGRATION: Recebimento de Mercadoria do Fabricante
-- =========================================================
-- Adiciona o fluxo de bipagem de caixas vindas do fabricante:
--   1. Importar PDF do Promob (parser no front extrai codigo_barras
--      de cada caixa) -> grava em caixas_previstas
--   2. Operador bipa cada caixa no recebimento, escolhe destino
--      (deposito ou cliente) e tira fotos como evidencia
--   3. Quando 100% bipado, status_recebimento do pedido muda
--   4. Se destino=cliente e nome foi coletado, marca como
--      entrega_finalizada
--
-- Estrutura:
--   caixas_previstas: 1 registro por codigo de barras esperado
--   recebimentos:     historico de bipagens (audit trail)
--   recebimento_fotos: fotos de evidencia (pedido + extras)
--   bucket storage 'recebimentos': guarda as fotos com RLS por loja
-- =========================================================

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

CREATE INDEX IF NOT EXISTS idx_caixas_previstas_pedido
  ON public.caixas_previstas(loja_id, numero_pedido);

CREATE INDEX IF NOT EXISTS idx_caixas_previstas_producao
  ON public.caixas_previstas(producao_terceirizada_id);

-- 2. Recebimentos (audit trail: 1 linha por bipagem)
CREATE TABLE IF NOT EXISTS public.recebimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid NOT NULL REFERENCES public.caixas_previstas(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  bipado_em timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid REFERENCES auth.users(id),
  usuario_nome text,
  bipado_via text CHECK (bipado_via IN ('input','camera'))
);

CREATE INDEX IF NOT EXISTS idx_recebimentos_caixa
  ON public.recebimentos(caixa_id);

-- 3. Fotos do recebimento (storage path + metadata)
--    tipo_evento: 'pedido' (1 foto obrigatoria ao finalizar) ou
--                 'extra' (fotos adicionais: avaria, ambiente montado, etc)
CREATE TABLE IF NOT EXISTS public.recebimento_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producao_terceirizada_id uuid NOT NULL REFERENCES public.producao_terceirizada(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  storage_path text NOT NULL,    -- caminho no bucket 'recebimentos'
  tipo_evento text NOT NULL DEFAULT 'pedido'
    CHECK (tipo_evento IN ('pedido','avaria','montagem','outro')),
  descricao text,
  uploaded_em timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_by_nome text
);

CREATE INDEX IF NOT EXISTS idx_recebimento_fotos_pedido
  ON public.recebimento_fotos(producao_terceirizada_id);

-- 4. Campos no producao_terceirizada para o fluxo de recebimento
ALTER TABLE public.producao_terceirizada
  ADD COLUMN IF NOT EXISTS status_recebimento text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (status_recebimento IN (
      'nao_iniciado',
      'em_recebimento',
      'recebido_deposito',
      'recebido_cliente',
      'entrega_finalizada'
    )),
  ADD COLUMN IF NOT EXISTS destino_recebimento text
    CHECK (destino_recebimento IN ('deposito','cliente')),
  ADD COLUMN IF NOT EXISTS recebido_em timestamptz,
  ADD COLUMN IF NOT EXISTS recebido_por text,
  ADD COLUMN IF NOT EXISTS entregue_para text,
  ADD COLUMN IF NOT EXISTS total_caixas_previstas int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_caixas_recebidas int NOT NULL DEFAULT 0;

-- 5. RLS nas tabelas novas
ALTER TABLE public.caixas_previstas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimento_fotos ENABLE ROW LEVEL SECURITY;

-- Helper: pegar loja_id do usuario logado
CREATE OR REPLACE FUNCTION public.current_user_loja_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT loja_id FROM public.usuarios_publico WHERE user_id = auth.uid() LIMIT 1;
$$;

-- caixas_previstas: SELECT para autenticado da mesma loja ou admin_master
DROP POLICY IF EXISTS "caixas_previstas_select" ON public.caixas_previstas;
CREATE POLICY "caixas_previstas_select" ON public.caixas_previstas
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR loja_id = public.current_user_loja_id()
  );

DROP POLICY IF EXISTS "caixas_previstas_insert" ON public.caixas_previstas;
CREATE POLICY "caixas_previstas_insert" ON public.caixas_previstas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_master()
    OR loja_id = public.current_user_loja_id()
  );

DROP POLICY IF EXISTS "caixas_previstas_update" ON public.caixas_previstas;
CREATE POLICY "caixas_previstas_update" ON public.caixas_previstas
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_master()
    OR loja_id = public.current_user_loja_id()
  );

DROP POLICY IF EXISTS "caixas_previstas_delete" ON public.caixas_previstas;
CREATE POLICY "caixas_previstas_delete" ON public.caixas_previstas
  FOR DELETE TO authenticated
  USING (
    public.is_admin_master()
    OR loja_id = public.current_user_loja_id()
  );

-- recebimentos: mesmo padrao
DROP POLICY IF EXISTS "recebimentos_select" ON public.recebimentos;
CREATE POLICY "recebimentos_select" ON public.recebimentos
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR loja_id = public.current_user_loja_id()
  );

DROP POLICY IF EXISTS "recebimentos_insert" ON public.recebimentos;
CREATE POLICY "recebimentos_insert" ON public.recebimentos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_master()
    OR loja_id = public.current_user_loja_id()
  );

-- recebimento_fotos: mesmo padrao
DROP POLICY IF EXISTS "recebimento_fotos_select" ON public.recebimento_fotos;
CREATE POLICY "recebimento_fotos_select" ON public.recebimento_fotos
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR loja_id = public.current_user_loja_id()
  );

DROP POLICY IF EXISTS "recebimento_fotos_insert" ON public.recebimento_fotos;
CREATE POLICY "recebimento_fotos_insert" ON public.recebimento_fotos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_master()
    OR loja_id = public.current_user_loja_id()
  );

DROP POLICY IF EXISTS "recebimento_fotos_delete" ON public.recebimento_fotos;
CREATE POLICY "recebimento_fotos_delete" ON public.recebimento_fotos
  FOR DELETE TO authenticated
  USING (
    public.is_admin_master()
    OR loja_id = public.current_user_loja_id()
  );

-- 6. Trigger: atualiza contadores no producao_terceirizada quando caixa muda
CREATE OR REPLACE FUNCTION public.atualizar_contadores_caixas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id uuid;
  v_total int;
  v_recebidas int;
BEGIN
  -- Pega o producao_terceirizada_id da caixa
  v_pedido_id := COALESCE(NEW.producao_terceirizada_id, OLD.producao_terceirizada_id);

  IF v_pedido_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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

-- 7. Bucket de Storage para fotos
--    Estrutura: recebimentos/{loja_id}/{pedido_id}/{filename}
--    Privado: requer signed URL para leitura
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recebimentos',
  'recebimentos',
  false,                              -- bucket privado
  10 * 1024 * 1024,                   -- 10MB por foto
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies: usuario da loja pode ler/escrever fotos da propria loja
-- Path esperado: {loja_id}/{pedido_id}/{filename}
DROP POLICY IF EXISTS "recebimentos_storage_select" ON storage.objects;
CREATE POLICY "recebimentos_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'recebimentos'
    AND (
      public.is_admin_master()
      OR (storage.foldername(name))[1]::uuid = public.current_user_loja_id()
    )
  );

DROP POLICY IF EXISTS "recebimentos_storage_insert" ON storage.objects;
CREATE POLICY "recebimentos_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'recebimentos'
    AND (
      public.is_admin_master()
      OR (storage.foldername(name))[1]::uuid = public.current_user_loja_id()
    )
  );

DROP POLICY IF EXISTS "recebimentos_storage_update" ON storage.objects;
CREATE POLICY "recebimentos_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'recebimentos'
    AND (
      public.is_admin_master()
      OR (storage.foldername(name))[1]::uuid = public.current_user_loja_id()
    )
  );

DROP POLICY IF EXISTS "recebimentos_storage_delete" ON storage.objects;
CREATE POLICY "recebimentos_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'recebimentos'
    AND (
      public.is_admin_master()
      OR (storage.foldername(name))[1]::uuid = public.current_user_loja_id()
    )
  );

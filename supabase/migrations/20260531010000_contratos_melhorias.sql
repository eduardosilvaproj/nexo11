-- ============ Melhorias Contratos: Aprovação, Aditivos, Alertas, Parcelas ============

-- 1. Novas colunas em contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS aprovacao_pendente BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS prazo_entrega DATE,
  ADD COLUMN IF NOT EXISTS prazo_montagem DATE,
  ADD COLUMN IF NOT EXISTS condicao_pagamento JSONB;

-- 2. Tabela de aprovações
CREATE TABLE IF NOT EXISTS public.contrato_aprovacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  etapa_origem TEXT NOT NULL,
  etapa_destino TEXT NOT NULL,
  solicitado_por UUID NOT NULL REFERENCES auth.users(id),
  aprovado_por UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  motivo_rejeicao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.contrato_aprovacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contrato_aprovacoes_select" ON public.contrato_aprovacoes
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "contrato_aprovacoes_insert" ON public.contrato_aprovacoes
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "contrato_aprovacoes_update" ON public.contrato_aprovacoes
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    ))
  );

CREATE INDEX IF NOT EXISTS idx_contrato_aprovacoes_contrato ON public.contrato_aprovacoes(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_aprovacoes_status ON public.contrato_aprovacoes(status) WHERE status = 'pendente';

-- 3. Tabela de aditivos
CREATE TABLE IF NOT EXISTS public.contrato_aditivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('valor', 'prazo', 'escopo', 'desconto')),
  descricao TEXT NOT NULL,
  valor_anterior NUMERIC(14,2),
  valor_novo NUMERIC(14,2),
  data_vigencia DATE,
  motivo TEXT,
  xml_itens JSONB,
  aprovado_por UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contrato_aditivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contrato_aditivos_select" ON public.contrato_aditivos
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "contrato_aditivos_insert" ON public.contrato_aditivos
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "contrato_aditivos_delete" ON public.contrato_aditivos
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (loja_id = current_loja_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    ))
  );

CREATE INDEX IF NOT EXISTS idx_contrato_aditivos_contrato ON public.contrato_aditivos(contrato_id);

-- 4. Atualizar avancar_contrato para suportar workflow de aprovação
CREATE OR REPLACE FUNCTION public.avancar_contrato(
  p_contrato_id uuid,
  p_usuario_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  c    public.contratos%ROWTYPE;
  prox public.contrato_status;
  upd  public.contrato_status;
  uid  uuid := COALESCE(p_usuario_id, auth.uid());
  is_gestor boolean;
BEGIN
  SELECT * INTO c FROM public.contratos WHERE id = p_contrato_id;
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Contrato não encontrado');
  END IF;

  IF NOT (
    public.has_role(uid, 'admin'::app_role)
    OR public.has_role(uid, 'franqueador'::app_role)
    OR c.loja_id = public.current_loja_id()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem permissão para este contrato');
  END IF;

  -- Verificar se é gestor (pode avançar direto)
  is_gestor := (
    public.has_role(uid, 'admin'::app_role)
    OR public.has_role(uid, 'franqueador'::app_role)
    OR public.has_role(uid, 'gerente'::app_role)
  );

  prox := CASE c.status
    WHEN 'comercial'   THEN 'medicao'::public.contrato_status
    WHEN 'medicao'     THEN 'conferencia'::public.contrato_status
    WHEN 'conferencia' THEN 'implantacao'::public.contrato_status
    WHEN 'implantacao' THEN 'producao'::public.contrato_status
    WHEN 'producao'    THEN 'entrada'::public.contrato_status
    WHEN 'entrada'     THEN 'montagem'::public.contrato_status
    WHEN 'montagem'    THEN 'pos_venda'::public.contrato_status
    WHEN 'pos_venda'   THEN 'finalizado'::public.contrato_status
    WHEN 'tecnico'     THEN 'producao'::public.contrato_status
    WHEN 'logistica'   THEN 'montagem'::public.contrato_status
    ELSE NULL
  END;

  IF prox IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Contrato já finalizado');
  END IF;

  -- Gates de trava por etapa
  IF c.status = 'comercial' THEN
    IF NOT c.assinado OR COALESCE(c.valor_venda,0) <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Contrato precisa estar assinado e ter valor de venda configurado');
    END IF;
  ELSIF c.status = 'medicao' THEN
    IF NOT COALESCE(c.trava_medicao_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Medição precisa estar 100% concluída');
    END IF;
  ELSIF c.status = 'conferencia' THEN
    IF NOT COALESCE(c.trava_conferencia_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Conferência precisa ser aprovada antes de avançar');
    END IF;
  ELSIF c.status = 'implantacao' THEN
    IF NOT COALESCE(c.trava_implantacao_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Financeiro precisa validar pagamento à fábrica');
    END IF;
  ELSIF c.status = 'producao' THEN
    IF NOT COALESCE(c.trava_producao_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Produção precisa estar concluída');
    END IF;
  ELSIF c.status = 'entrada' THEN
    IF NOT COALESCE(c.trava_entrada_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Material recebido precisa ser conferido antes de montar');
    END IF;
  ELSIF c.status = 'montagem' THEN
    IF NOT COALESCE(c.trava_montagem_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Montagem precisa estar concluída');
    END IF;
  END IF;

  -- Se não é gestor, criar solicitação de aprovação
  IF NOT is_gestor THEN
    INSERT INTO public.contrato_aprovacoes (contrato_id, loja_id, etapa_origem, etapa_destino, solicitado_por)
    VALUES (p_contrato_id, c.loja_id, c.status::text, prox::text, uid);

    UPDATE public.contratos SET aprovacao_pendente = true WHERE id = p_contrato_id;

    RETURN jsonb_build_object('ok', true, 'aprovacao_pendente', true, 'mensagem', 'Solicitação de aprovação enviada ao gerente');
  END IF;

  -- Gestor avança direto
  BEGIN
    UPDATE public.contratos
    SET status = prox, aprovacao_pendente = false, aprovado_por = uid
    WHERE id = p_contrato_id
    RETURNING status INTO upd;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'erro', SQLERRM);
  END;

  RETURN jsonb_build_object('ok', true, 'status_novo', upd, 'status_anterior', c.status);
END;
$function$;

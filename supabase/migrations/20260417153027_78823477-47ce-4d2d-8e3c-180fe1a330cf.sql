-- 1) RLS de checklists_tecnicos: separar leitura (todos da loja) de escrita (tecnico/gerente/admin)
DROP POLICY IF EXISTS "Checklists gerenciados pela loja" ON public.checklists_tecnicos;
DROP POLICY IF EXISTS "Checklists visíveis por contrato" ON public.checklists_tecnicos;

CREATE POLICY "Checklists visíveis por contrato"
ON public.checklists_tecnicos
FOR SELECT
TO authenticated
USING (contrato_da_loja(contrato_id) OR has_role(auth.uid(), 'franqueador'::app_role));

CREATE POLICY "Checklists insert por tecnico/gerente/admin"
ON public.checklists_tecnicos
FOR INSERT
TO authenticated
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
  )
);

CREATE POLICY "Checklists update por tecnico/gerente/admin"
ON public.checklists_tecnicos
FOR UPDATE
TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
  )
)
WITH CHECK (
  contrato_da_loja(contrato_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
  )
);

CREATE POLICY "Checklists delete por gerente/admin"
ON public.checklists_tecnicos
FOR DELETE
TO authenticated
USING (
  contrato_da_loja(contrato_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
  )
);

-- 2) avancar_contrato: validar papel do usuário em cada transição
CREATE OR REPLACE FUNCTION public.avancar_contrato(p_contrato_id uuid, p_usuario_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  cur  public.contrato_status;
  prox public.contrato_status;
  upd  public.contrato_status;
  uid  uuid := auth.uid();
  loja uuid;
BEGIN
  SELECT status, loja_id INTO cur, loja FROM public.contratos WHERE id = p_contrato_id;
  IF cur IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Contrato não encontrado');
  END IF;

  -- contrato deve ser da loja do usuário (ou admin/franqueador)
  IF NOT (
    public.has_role(uid, 'admin'::app_role)
    OR public.has_role(uid, 'franqueador'::app_role)
    OR loja = public.current_loja_id()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem permissão para este contrato');
  END IF;

  prox := CASE cur
    WHEN 'comercial'  THEN 'tecnico'::public.contrato_status
    WHEN 'tecnico'    THEN 'producao'::public.contrato_status
    WHEN 'producao'   THEN 'logistica'::public.contrato_status
    WHEN 'logistica'  THEN 'montagem'::public.contrato_status
    WHEN 'montagem'   THEN 'pos_venda'::public.contrato_status
    WHEN 'pos_venda'  THEN 'finalizado'::public.contrato_status
    ELSE NULL
  END;

  IF prox IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Contrato já finalizado');
  END IF;

  -- Validação de papel por etapa de origem
  IF cur = 'comercial' THEN
    IF NOT (
      public.has_role(uid, 'admin'::app_role)
      OR public.has_role(uid, 'gerente'::app_role)
      OR public.has_role(uid, 'vendedor'::app_role)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Apenas vendedor, gerente ou admin podem avançar a etapa comercial');
    END IF;
  ELSIF cur = 'tecnico' THEN
    IF NOT (
      public.has_role(uid, 'admin'::app_role)
      OR public.has_role(uid, 'gerente'::app_role)
      OR public.has_role(uid, 'tecnico'::app_role)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Apenas técnico, gerente ou admin podem liberar para produção');
    END IF;
  ELSIF cur = 'producao' THEN
    IF NOT (
      public.has_role(uid, 'admin'::app_role)
      OR public.has_role(uid, 'gerente'::app_role)
      OR public.has_role(uid, 'tecnico'::app_role)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Apenas técnico, gerente ou admin podem avançar a produção');
    END IF;
  ELSIF cur = 'logistica' THEN
    IF NOT (
      public.has_role(uid, 'admin'::app_role)
      OR public.has_role(uid, 'gerente'::app_role)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Apenas gerente ou admin podem avançar a logística');
    END IF;
  ELSIF cur = 'montagem' THEN
    IF NOT (
      public.has_role(uid, 'admin'::app_role)
      OR public.has_role(uid, 'gerente'::app_role)
      OR public.has_role(uid, 'montador'::app_role)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Apenas montador, gerente ou admin podem avançar a montagem');
    END IF;
  ELSIF cur = 'pos_venda' THEN
    IF NOT (
      public.has_role(uid, 'admin'::app_role)
      OR public.has_role(uid, 'gerente'::app_role)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Apenas gerente ou admin podem finalizar o contrato');
    END IF;
  END IF;

  BEGIN
    UPDATE public.contratos SET status = prox WHERE id = p_contrato_id
    RETURNING status INTO upd;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'erro', SQLERRM);
  END;

  RETURN jsonb_build_object('ok', true, 'status_novo', upd, 'status_anterior', cur);
END;
$function$;
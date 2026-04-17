-- 1. New roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'medidor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'conferente';

-- 2. Contratos: sub-etapa + travas + responsáveis
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS sub_etapa_tecnico text NOT NULL DEFAULT 'medicao'
    CHECK (sub_etapa_tecnico IN ('medicao','conferencia')),
  ADD COLUMN IF NOT EXISTS trava_medicao_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trava_tecnico_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS medicao_responsavel_id uuid,
  ADD COLUMN IF NOT EXISTS conferencia_responsavel_id uuid;

-- 3. Checklist sub-etapa
ALTER TABLE public.checklists_tecnicos
  ADD COLUMN IF NOT EXISTS sub_etapa text NOT NULL DEFAULT 'conferencia'
    CHECK (sub_etapa IN ('medicao','conferencia'));

CREATE INDEX IF NOT EXISTS idx_checklists_tecnicos_contrato_subetapa
  ON public.checklists_tecnicos(contrato_id, sub_etapa);

-- 4. Trigger: ao marcar item concluído, recalcula travas e avança sub-etapa
CREATE OR REPLACE FUNCTION public.checklist_atualiza_travas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_med int; ok_med int;
  total_conf int; ok_conf int;
  cur_sub text;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE concluido)
    INTO total_med, ok_med
    FROM public.checklists_tecnicos
   WHERE contrato_id = COALESCE(NEW.contrato_id, OLD.contrato_id)
     AND sub_etapa = 'medicao';

  SELECT count(*), count(*) FILTER (WHERE concluido)
    INTO total_conf, ok_conf
    FROM public.checklists_tecnicos
   WHERE contrato_id = COALESCE(NEW.contrato_id, OLD.contrato_id)
     AND sub_etapa = 'conferencia';

  SELECT sub_etapa_tecnico INTO cur_sub
    FROM public.contratos
   WHERE id = COALESCE(NEW.contrato_id, OLD.contrato_id);

  UPDATE public.contratos
     SET trava_medicao_ok = (total_med > 0 AND ok_med = total_med),
         trava_tecnico_ok = (total_conf > 0 AND ok_conf = total_conf),
         sub_etapa_tecnico = CASE
           WHEN cur_sub = 'medicao' AND total_med > 0 AND ok_med = total_med
             THEN 'conferencia'
           ELSE cur_sub
         END
   WHERE id = COALESCE(NEW.contrato_id, OLD.contrato_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_checklist_travas ON public.checklists_tecnicos;
CREATE TRIGGER trg_checklist_travas
AFTER INSERT OR UPDATE OF concluido OR DELETE
ON public.checklists_tecnicos
FOR EACH ROW
EXECUTE FUNCTION public.checklist_atualiza_travas();
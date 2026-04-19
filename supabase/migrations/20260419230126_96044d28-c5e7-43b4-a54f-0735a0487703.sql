-- Add medição fields per ambiente (mirrors montador fields)
ALTER TABLE public.contrato_ambientes
  ADD COLUMN IF NOT EXISTS medidor_id uuid REFERENCES public.tecnicos_montadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS percentual_medidor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_medidor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_medicao public.ambiente_status_montagem NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_medicao date;

-- Update calc trigger to also compute valor_medidor
CREATE OR REPLACE FUNCTION public.contrato_ambiente_calcular()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.valor_liquido := ROUND(COALESCE(NEW.valor_bruto, 0) * (1 - COALESCE(NEW.desconto_percentual, 0) / 100), 2);
  NEW.valor_montador := ROUND(NEW.valor_liquido * COALESCE(NEW.percentual_montador, 0) / 100, 2);
  NEW.valor_medidor := ROUND(NEW.valor_liquido * COALESCE(NEW.percentual_medidor, 0) / 100, 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
-- Add conferente fields to contrato_ambientes
ALTER TABLE public.contrato_ambientes
  ADD COLUMN IF NOT EXISTS conferente_id uuid REFERENCES public.tecnicos_montadores(id),
  ADD COLUMN IF NOT EXISTS percentual_conferente numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_conferente numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_conferencia public.ambiente_status_montagem NOT NULL DEFAULT 'pendente'::public.ambiente_status_montagem,
  ADD COLUMN IF NOT EXISTS data_conferencia date;

-- Update calc trigger function to also compute valor_conferente
CREATE OR REPLACE FUNCTION public.contrato_ambiente_calcular()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.valor_liquido := ROUND(COALESCE(NEW.valor_bruto, 0) * (1 - COALESCE(NEW.desconto_percentual, 0) / 100), 2);
  NEW.valor_montador := ROUND(NEW.valor_liquido * COALESCE(NEW.percentual_montador, 0) / 100, 2);
  NEW.valor_medidor := ROUND(NEW.valor_liquido * COALESCE(NEW.percentual_medidor, 0) / 100, 2);
  NEW.valor_conferente := ROUND(NEW.valor_liquido * COALESCE(NEW.percentual_conferente, 0) / 100, 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
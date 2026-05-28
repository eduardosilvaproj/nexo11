
-- 1. config_viagem table
CREATE TABLE public.config_viagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid REFERENCES public.lojas(id) ON DELETE CASCADE UNIQUE,
  valor_montagem_dia numeric NOT NULL DEFAULT 5000,
  min_montadores integer NOT NULL DEFAULT 2,
  hotel_por_pessoa numeric NOT NULL DEFAULT 250,
  refeicao_montador_dia numeric NOT NULL DEFAULT 100,
  refeicao_medidor numeric NOT NULL DEFAULT 40,
  consumo_km_litro numeric NOT NULL DEFAULT 10,
  preco_gasolina numeric NOT NULL DEFAULT 5.80,
  valor_medicao_dia numeric NOT NULL DEFAULT 200000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.config_viagem TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.config_viagem TO authenticated;
GRANT ALL ON public.config_viagem TO service_role;

ALTER TABLE public.config_viagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_viagem select all authenticated"
  ON public.config_viagem FOR SELECT TO authenticated USING (true);

CREATE POLICY "config_viagem managers insert"
  ON public.config_viagem FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente'::app_role) OR
    public.has_role(auth.uid(), 'financeiro'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'admin_master'::app_role)
  );

CREATE POLICY "config_viagem managers update"
  ON public.config_viagem FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente'::app_role) OR
    public.has_role(auth.uid(), 'financeiro'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'admin_master'::app_role)
  );

CREATE POLICY "config_viagem managers delete"
  ON public.config_viagem FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'admin_master'::app_role)
  );

CREATE TRIGGER trg_config_viagem_updated_at
  BEFORE UPDATE ON public.config_viagem
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add custo_viagem fields to contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS distancia_km numeric,
  ADD COLUMN IF NOT EXISTS custo_viagem numeric,
  ADD COLUMN IF NOT EXISTS custo_viagem_detalhamento jsonb,
  ADD COLUMN IF NOT EXISTS custo_viagem_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custo_viagem_calculado_em timestamptz;

-- 3. Trigger: only gerente/financeiro/admin can change custo_viagem fields manually.
-- Edge function uses service_role and bypasses this.
CREATE OR REPLACE FUNCTION public.protect_custo_viagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.custo_viagem IS DISTINCT FROM OLD.custo_viagem)
     OR (NEW.custo_viagem_detalhamento IS DISTINCT FROM OLD.custo_viagem_detalhamento)
     OR (NEW.distancia_km IS DISTINCT FROM OLD.distancia_km)
     OR (NEW.custo_viagem_override IS DISTINCT FROM OLD.custo_viagem_override) THEN
    IF auth.uid() IS NOT NULL AND NOT (
      public.has_role(auth.uid(), 'gerente'::app_role) OR
      public.has_role(auth.uid(), 'financeiro'::app_role) OR
      public.has_role(auth.uid(), 'admin'::app_role) OR
      public.has_role(auth.uid(), 'admin_master'::app_role)
    ) THEN
      RAISE EXCEPTION 'Apenas gerente ou financeiro podem alterar o custo de viagem.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_custo_viagem ON public.contratos;
CREATE TRIGGER trg_protect_custo_viagem
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.protect_custo_viagem();

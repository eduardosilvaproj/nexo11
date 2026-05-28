
ALTER TABLE public.config_viagem
  ADD COLUMN IF NOT EXISTS locomocao_diaria_km numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS montadores_por_carro integer NOT NULL DEFAULT 2;

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS viagem_qtd_montadores integer,
  ADD COLUMN IF NOT EXISTS viagem_qtd_veiculos integer;

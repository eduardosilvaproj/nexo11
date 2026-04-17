-- Enum status entrega
DO $$ BEGIN
  CREATE TYPE public.entrega_status AS ENUM ('pendente','confirmada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela entregas
CREATE TABLE IF NOT EXISTS public.entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  transportadora text,
  data_prevista date,
  rota text,
  custo_frete numeric(14,2) NOT NULL DEFAULT 0,
  status public.entrega_status NOT NULL DEFAULT 'pendente',
  foto_confirmacao_path text,
  data_confirmacao timestamptz,
  confirmado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entregas_contrato ON public.entregas(contrato_id);

ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entregas visíveis por contrato"
ON public.entregas FOR SELECT
TO authenticated
USING (public.contrato_da_loja(contrato_id) OR public.has_role(auth.uid(), 'franqueador'));

CREATE POLICY "Entregas gerenciadas pela loja"
ON public.entregas FOR ALL
TO authenticated
USING (public.contrato_da_loja(contrato_id))
WITH CHECK (public.contrato_da_loja(contrato_id));

-- Trigger updated_at
CREATE TRIGGER trg_entregas_updated_at
BEFORE UPDATE ON public.entregas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync DRE: custo_frete_previsto e custo_frete_real
CREATE OR REPLACE FUNCTION public.entrega_sync_dre()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.dre_contrato
     SET custo_frete_previsto = COALESCE(NEW.custo_frete, 0),
         custo_frete_real = CASE WHEN NEW.status = 'confirmada' THEN COALESCE(NEW.custo_frete, 0) ELSE custo_frete_real END
   WHERE contrato_id = NEW.contrato_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entrega_sync_dre
AFTER INSERT OR UPDATE OF custo_frete, status ON public.entregas
FOR EACH ROW EXECUTE FUNCTION public.entrega_sync_dre();

-- Sync agendamentos_montagem.entrega_confirmada quando confirmada
CREATE OR REPLACE FUNCTION public.entrega_sync_agendamento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmada' THEN
    UPDATE public.agendamentos_montagem
       SET entrega_confirmada = true
     WHERE contrato_id = NEW.contrato_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entrega_sync_agendamento
AFTER UPDATE OF status ON public.entregas
FOR EACH ROW EXECUTE FUNCTION public.entrega_sync_agendamento();

-- Bucket público para foto de confirmação
INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas-fotos', 'entregas-fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Entregas fotos - leitura pública"
ON storage.objects FOR SELECT
USING (bucket_id = 'entregas-fotos');

CREATE POLICY "Entregas fotos - upload por loja"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'entregas-fotos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Entregas fotos - update por loja"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'entregas-fotos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Entregas fotos - delete por loja"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'entregas-fotos'
  AND public.contrato_da_loja(((storage.foldername(name))[1])::uuid)
);
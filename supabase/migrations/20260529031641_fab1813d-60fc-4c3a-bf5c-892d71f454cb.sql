
-- =========== TABLES ===========

CREATE TABLE public.frota_postos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid REFERENCES public.lojas(id),
  nome text NOT NULL,
  cnpj text,
  endereco text,
  telefone text,
  bandeira text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_postos TO authenticated;
GRANT ALL ON public.frota_postos TO service_role;
ALTER TABLE public.frota_postos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frota_postos select" ON public.frota_postos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
  OR public.has_role(auth.uid(),'franqueador'::app_role)
);
CREATE POLICY "frota_postos write" ON public.frota_postos FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
);

CREATE TABLE public.veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text NOT NULL UNIQUE,
  modelo text NOT NULL,
  marca text NOT NULL,
  ano_fabricacao integer,
  cor text,
  tipo_combustivel text DEFAULT 'gasolina',
  capacidade_tanque numeric DEFAULT 50,
  km_atual numeric DEFAULT 0,
  status text DEFAULT 'disponivel',
  foto_url text,
  proprietario text DEFAULT 'frota',
  loja_id uuid REFERENCES public.lojas(id),
  seguro_numero text,
  seguro_validade date,
  iptu_vencimento date,
  licenciamento_vencimento date,
  revisoes jsonb DEFAULT '[]'::jsonb,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "veiculos select" ON public.veiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "veiculos write" ON public.veiculos FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
);

CREATE TABLE public.pessoas_cnh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  numero_cnh text NOT NULL,
  categoria text,
  data_validade date NOT NULL,
  data_validade_reciclagem date,
  foto_cnh_url text,
  status text DEFAULT 'valida',
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pessoa_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pessoas_cnh TO authenticated;
GRANT ALL ON public.pessoas_cnh TO service_role;
ALTER TABLE public.pessoas_cnh ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cnh select" ON public.pessoas_cnh FOR SELECT TO authenticated
USING (
  pessoa_id IN (SELECT id FROM public.pessoas WHERE auth_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'rh'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
);
CREATE POLICY "cnh write" ON public.pessoas_cnh FOR ALL TO authenticated
USING (
  pessoa_id IN (SELECT id FROM public.pessoas WHERE auth_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'rh'::app_role)
)
WITH CHECK (
  pessoa_id IN (SELECT id FROM public.pessoas WHERE auth_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'rh'::app_role)
);

CREATE TABLE public.frota_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  pessoa_id uuid REFERENCES public.pessoas(id),
  contrato_id uuid REFERENCES public.contratos(id),
  tipo text NOT NULL,
  km_inicial numeric,
  km_final numeric,
  km_percorrido numeric GENERATED ALWAYS AS (COALESCE(km_final,0) - COALESCE(km_inicial,0)) STORED,
  data_inicio timestamptz DEFAULT now(),
  data_fim timestamptz,
  motivo text,
  destino text,
  observacao text,
  foto_hodometro_inicio_url text,
  foto_hodometro_fim_url text,
  fotos_vistoria_antes jsonb DEFAULT '[]'::jsonb,
  fotos_vistoria_depois jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'aberto',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_movimentacoes TO authenticated;
GRANT ALL ON public.frota_movimentacoes TO service_role;
ALTER TABLE public.frota_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frota_mov select" ON public.frota_movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "frota_mov insert" ON public.frota_movimentacoes FOR INSERT TO authenticated
WITH CHECK (
  pessoa_id IN (SELECT id FROM public.pessoas WHERE auth_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
);
CREATE POLICY "frota_mov update" ON public.frota_movimentacoes FOR UPDATE TO authenticated
USING (
  pessoa_id IN (SELECT id FROM public.pessoas WHERE auth_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
);
CREATE POLICY "frota_mov delete" ON public.frota_movimentacoes FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
);

CREATE TABLE public.frota_abastecimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id),
  pessoa_id uuid REFERENCES public.pessoas(id),
  posto_id uuid REFERENCES public.frota_postos(id),
  loja_id uuid REFERENCES public.lojas(id),
  data_abastecimento date DEFAULT current_date,
  litros numeric NOT NULL,
  valor_total numeric NOT NULL,
  preco_por_litro numeric,
  km_atual numeric,
  combustivel_tipo text,
  comprovante_url text,
  status text DEFAULT 'solicitado',
  aprovado_por uuid REFERENCES public.pessoas(id),
  data_aprovacao timestamptz,
  motivo_reprovacao text,
  codigo_autorizacao text,
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_abastecimentos TO authenticated;
GRANT ALL ON public.frota_abastecimentos TO service_role;
ALTER TABLE public.frota_abastecimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abast select" ON public.frota_abastecimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "abast insert" ON public.frota_abastecimentos FOR INSERT TO authenticated
WITH CHECK (
  pessoa_id IN (SELECT id FROM public.pessoas WHERE auth_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
);
CREATE POLICY "abast update" ON public.frota_abastecimentos FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'financeiro'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
);
CREATE POLICY "abast delete" ON public.frota_abastecimentos FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
);

CREATE TABLE public.frota_manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text,
  km_atual numeric,
  data_prevista date,
  data_realizada date,
  valor numeric,
  oficina text,
  nota_fiscal_url text,
  observacao text,
  status text DEFAULT 'agendado',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_manutencoes TO authenticated;
GRANT ALL ON public.frota_manutencoes TO service_role;
ALTER TABLE public.frota_manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manut select" ON public.frota_manutencoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "manut write" ON public.frota_manutencoes FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
);

CREATE TABLE public.frota_multas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  pessoa_id uuid REFERENCES public.pessoas(id),
  numero_auto text,
  data_infracao date,
  local_infracao text,
  tipo_infracao text,
  gravidade text,
  valor numeric,
  pontos integer,
  status text DEFAULT 'pendente',
  comprovante_url text,
  data_pagamento date,
  valor_pago numeric,
  responsavel_pagamento text,
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_multas TO authenticated;
GRANT ALL ON public.frota_multas TO service_role;
ALTER TABLE public.frota_multas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "multas select" ON public.frota_multas FOR SELECT TO authenticated USING (true);
CREATE POLICY "multas write" ON public.frota_multas FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
  OR public.has_role(auth.uid(),'financeiro'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
  OR public.has_role(auth.uid(),'financeiro'::app_role)
);

CREATE TABLE public.frota_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE CASCADE,
  pessoa_id uuid REFERENCES public.pessoas(id),
  mensagem text NOT NULL,
  severidade text DEFAULT 'media',
  lida boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.pessoas(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_alertas TO authenticated;
GRANT ALL ON public.frota_alertas TO service_role;
ALTER TABLE public.frota_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alertas select" ON public.frota_alertas FOR SELECT TO authenticated USING (true);
CREATE POLICY "alertas write" ON public.frota_alertas FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'admin_master'::app_role)
  OR public.has_role(auth.uid(),'gerente'::app_role)
  OR public.has_role(auth.uid(),'logistico'::app_role)
);

-- =========== TRIGGERS ===========

CREATE TRIGGER trg_veiculos_updated BEFORE UPDATE ON public.veiculos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_postos_updated BEFORE UPDATE ON public.frota_postos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cnh_updated BEFORE UPDATE ON public.pessoas_cnh
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_frota_mov_updated BEFORE UPDATE ON public.frota_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_abast_updated BEFORE UPDATE ON public.frota_abastecimentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_manut_updated BEFORE UPDATE ON public.frota_manutencoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_multas_updated BEFORE UPDATE ON public.frota_multas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar km_atual do veículo a cada movimentação concluída
CREATE OR REPLACE FUNCTION public.frota_mov_atualizar_km()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.km_final IS NOT NULL AND (OLD.km_final IS NULL OR NEW.km_final <> OLD.km_final) THEN
    UPDATE public.veiculos SET km_atual = GREATEST(km_atual, NEW.km_final), status='disponivel'
     WHERE id = NEW.veiculo_id;
  END IF;
  IF TG_OP='INSERT' AND NEW.tipo='checkin' THEN
    UPDATE public.veiculos SET status='em_uso' WHERE id = NEW.veiculo_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_frota_mov_km AFTER INSERT OR UPDATE ON public.frota_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.frota_mov_atualizar_km();

-- Atualizar status da CNH baseado na validade
CREATE OR REPLACE FUNCTION public.cnh_atualizar_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.data_validade < current_date THEN NEW.status='vencida';
  ELSIF NEW.data_validade < current_date + interval '30 days' THEN NEW.status='vencendo';
  ELSE NEW.status='valida';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_cnh_status BEFORE INSERT OR UPDATE ON public.pessoas_cnh
FOR EACH ROW EXECUTE FUNCTION public.cnh_atualizar_status();

-- RPC: validar CNH e criar check-in
CREATE OR REPLACE FUNCTION public.frota_checkin(
  _veiculo_id uuid, _km_inicial numeric, _foto_url text,
  _motivo text DEFAULT NULL, _destino text DEFAULT NULL, _contrato_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _pessoa_id uuid;
  _cnh record;
  _mov_id uuid;
BEGIN
  SELECT id INTO _pessoa_id FROM public.pessoas WHERE auth_user_id = auth.uid() LIMIT 1;
  IF _pessoa_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'erro','Pessoa não encontrada');
  END IF;
  SELECT * INTO _cnh FROM public.pessoas_cnh WHERE pessoa_id=_pessoa_id;
  IF _cnh.id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'erro','CNH não cadastrada. Cadastre antes de usar o veículo.');
  END IF;
  IF _cnh.data_validade < current_date THEN
    INSERT INTO public.frota_alertas(tipo,veiculo_id,pessoa_id,mensagem,severidade)
    VALUES ('cnh_vencida',_veiculo_id,_pessoa_id,'Tentativa de uso com CNH vencida','alta');
    RETURN jsonb_build_object('ok',false,'erro','CNH vencida em '||_cnh.data_validade);
  END IF;
  INSERT INTO public.frota_movimentacoes(veiculo_id,pessoa_id,tipo,km_inicial,foto_hodometro_inicio_url,motivo,destino,contrato_id,status)
  VALUES(_veiculo_id,_pessoa_id,'checkin',_km_inicial,_foto_url,_motivo,_destino,_contrato_id,'aberto')
  RETURNING id INTO _mov_id;
  RETURN jsonb_build_object('ok',true,'movimentacao_id',_mov_id);
END $$;

GRANT EXECUTE ON FUNCTION public.frota_checkin(uuid,numeric,text,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.frota_checkout(
  _mov_id uuid, _km_final numeric, _foto_url text, _observacao text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _mov record;
BEGIN
  SELECT * INTO _mov FROM public.frota_movimentacoes WHERE id=_mov_id;
  IF _mov.id IS NULL THEN RETURN jsonb_build_object('ok',false,'erro','Movimentação não encontrada'); END IF;
  IF _km_final < _mov.km_inicial THEN
    RETURN jsonb_build_object('ok',false,'erro','KM final menor que KM inicial');
  END IF;
  UPDATE public.frota_movimentacoes
     SET km_final=_km_final, foto_hodometro_fim_url=_foto_url, data_fim=now(),
         observacao=COALESCE(_observacao,observacao), status='concluido'
   WHERE id=_mov_id;
  RETURN jsonb_build_object('ok',true);
END $$;

GRANT EXECUTE ON FUNCTION public.frota_checkout(uuid,numeric,text,text) TO authenticated;

-- Storage bucket para frota
INSERT INTO storage.buckets (id,name,public) VALUES ('frota','frota',true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "frota bucket read" ON storage.objects FOR SELECT
USING (bucket_id='frota');
CREATE POLICY "frota bucket write auth" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='frota');
CREATE POLICY "frota bucket update auth" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='frota');
CREATE POLICY "frota bucket delete auth" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='frota');

-- Indexes
CREATE INDEX idx_veiculos_loja ON public.veiculos(loja_id);
CREATE INDEX idx_veiculos_status ON public.veiculos(status);
CREATE INDEX idx_frota_mov_veiculo ON public.frota_movimentacoes(veiculo_id);
CREATE INDEX idx_frota_mov_pessoa ON public.frota_movimentacoes(pessoa_id);
CREATE INDEX idx_frota_mov_status ON public.frota_movimentacoes(status);
CREATE INDEX idx_abast_veiculo ON public.frota_abastecimentos(veiculo_id);
CREATE INDEX idx_abast_status ON public.frota_abastecimentos(status);
CREATE INDEX idx_manut_veiculo ON public.frota_manutencoes(veiculo_id);
CREATE INDEX idx_multas_veiculo ON public.frota_multas(veiculo_id);
CREATE INDEX idx_alertas_lida ON public.frota_alertas(lida);
CREATE INDEX idx_cnh_pessoa ON public.pessoas_cnh(pessoa_id);

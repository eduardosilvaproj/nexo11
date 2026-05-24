-- 1. Melhorias estruturais em financeiro_contas_pagar
ALTER TABLE public.financeiro_contas_pagar 
ADD COLUMN IF NOT EXISTS comissao_id UUID REFERENCES public.comissoes(id),
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;

-- Constraint de valor não negativo (com tratamento para o caso de já existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financeiro_contas_pagar_valor_check') THEN
        ALTER TABLE public.financeiro_contas_pagar ADD CONSTRAINT financeiro_contas_pagar_valor_check CHECK (valor >= 0);
    END IF;
END $$;

-- Garantir que uma comissão só tenha uma conta a pagar vinculada
CREATE UNIQUE INDEX IF NOT EXISTS idx_financeiro_contas_pagar_comissao_id ON public.financeiro_contas_pagar(comissao_id) WHERE comissao_id IS NOT NULL;

-- 2. Melhorias estruturais em financeiro_contas_receber
ALTER TABLE public.financeiro_contas_receber 
ADD COLUMN IF NOT EXISTS lote_parcelamento_id UUID,
ADD COLUMN IF NOT EXISTS numero_parcela INTEGER,
ADD COLUMN IF NOT EXISTS total_parcelas INTEGER,
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financeiro_contas_receber_valor_check') THEN
        ALTER TABLE public.financeiro_contas_receber ADD CONSTRAINT financeiro_contas_receber_valor_check CHECK (valor >= 0);
    END IF;
END $$;

-- 3. Melhorias estruturais em comissoes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comissoes_valor_check') THEN
        ALTER TABLE public.comissoes ADD CONSTRAINT comissoes_valor_check CHECK (valor >= 0);
    END IF;
END $$;

-- 4. RPC para gerar parcelas de forma atômica
CREATE OR REPLACE FUNCTION public.gerar_parcelas_contrato(
  p_contrato_id UUID,
  p_loja_id UUID,
  p_parcelas JSONB,
  p_lote_id UUID DEFAULT gen_random_uuid()
) RETURNS VOID AS $$
DECLARE
  v_parcela JSONB;
BEGIN
  FOR v_parcela IN SELECT * FROM jsonb_array_elements(p_parcelas)
  LOOP
    INSERT INTO public.financeiro_contas_receber (
      loja_id,
      contrato_id,
      descricao,
      valor,
      vencimento,
      status,
      lote_parcelamento_id,
      numero_parcela,
      total_parcelas
    ) VALUES (
      p_loja_id,
      p_contrato_id,
      (v_parcela->>'descricao'),
      (v_parcela->>'valor')::NUMERIC,
      (v_parcela->>'vencimento')::DATE,
      'pendente',
      p_lote_id,
      (v_parcela->>'numero')::INTEGER,
      (v_parcela->>'total')::INTEGER
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC para confirmar pagamento de comissão com integração financeira
CREATE OR REPLACE FUNCTION public.confirmar_pagamento_comissao(
  p_comissao_id UUID,
  p_data_pagamento DATE,
  p_forma_pagamento TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_comissao RECORD;
BEGIN
  SELECT * INTO v_comissao FROM public.comissoes WHERE id = p_comissao_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comissão não encontrada';
  END IF;
  
  IF v_comissao.status = 'paga' THEN
    RAISE EXCEPTION 'Comissão já está marcada como paga';
  END IF;

  UPDATE public.comissoes 
  SET status = 'paga', 
      data_pagamento = p_data_pagamento 
  WHERE id = p_comissao_id;

  INSERT INTO public.financeiro_contas_pagar (
    loja_id,
    contrato_id,
    comissao_id,
    categoria,
    descricao,
    valor,
    vencimento,
    data_pagamento,
    status,
    forma_pagamento,
    observacoes
  ) VALUES (
    v_comissao.loja_id,
    v_comissao.contrato_id,
    v_comissao.id,
    'Comissão',
    'Comissão vinculada',
    v_comissao.valor,
    p_data_pagamento,
    p_data_pagamento,
    'pago',
    p_forma_pagamento,
    'Gerado via módulo de comissões'
  )
  ON CONFLICT (comissao_id) DO UPDATE SET
    status = 'pago',
    data_pagamento = p_data_pagamento,
    forma_pagamento = p_forma_pagamento;

  INSERT INTO public.contrato_logs (
    contrato_id,
    acao,
    etapa,
    titulo,
    descricao
  ) VALUES (
    v_comissao.contrato_id,
    'comissao_paga',
    'comercial',
    'Comissão paga',
    'Comissão paga e integrada ao financeiro'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC para estorno de lançamentos
CREATE OR REPLACE FUNCTION public.estornar_lancamento(
  p_id UUID,
  p_tipo TEXT
) RETURNS VOID AS $$
DECLARE
  v_comissao_id UUID;
BEGIN
  IF p_tipo = 'receita' THEN
    UPDATE public.financeiro_contas_receber 
    SET status = 'pendente', 
        data_pagamento = NULL, 
        forma_pagamento = NULL 
    WHERE id = p_id;
  ELSE
    SELECT comissao_id INTO v_comissao_id FROM public.financeiro_contas_pagar WHERE id = p_id;
    
    UPDATE public.financeiro_contas_pagar 
    SET status = 'pendente', 
        data_pagamento = NULL, 
        forma_pagamento = NULL 
    WHERE id = p_id;
    
    IF v_comissao_id IS NOT NULL THEN
      UPDATE public.comissoes SET status = 'liberada', data_pagamento = NULL WHERE id = v_comissao_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ocorrências de montagem
CREATE TABLE IF NOT EXISTS public.montagem_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos_montagem(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('dano', 'falta_material', 'retrabalho', 'atraso', 'outro')),
  descricao TEXT NOT NULL,
  gravidade TEXT NOT NULL DEFAULT 'media' CHECK (gravidade IN ('baixa', 'media', 'alta')),
  foto_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_montagem_ocorrencias_agendamento ON public.montagem_ocorrencias(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_montagem_ocorrencias_contrato ON public.montagem_ocorrencias(contrato_id);

-- RLS
ALTER TABLE public.montagem_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "montagem_ocorrencias_select" ON public.montagem_ocorrencias
  FOR SELECT USING (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "montagem_ocorrencias_insert" ON public.montagem_ocorrencias
  FOR INSERT WITH CHECK (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "montagem_ocorrencias_update" ON public.montagem_ocorrencias
  FOR UPDATE USING (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "montagem_ocorrencias_delete" ON public.montagem_ocorrencias
  FOR DELETE USING (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

-- Avaliações de montagem
CREATE TABLE IF NOT EXISTS public.montagem_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos_montagem(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  nota_geral INTEGER CHECK (nota_geral BETWEEN 1 AND 5),
  nota_pontualidade INTEGER CHECK (nota_pontualidade BETWEEN 1 AND 5),
  nota_limpeza INTEGER CHECK (nota_limpeza BETWEEN 1 AND 5),
  nota_qualidade INTEGER CHECK (nota_qualidade BETWEEN 1 AND 5),
  nota_atendimento INTEGER CHECK (nota_atendimento BETWEEN 1 AND 5),
  nps INTEGER CHECK (nps BETWEEN 0 AND 10),
  comentario TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agendamento_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_montagem_avaliacoes_contrato ON public.montagem_avaliacoes(contrato_id);

-- RLS
ALTER TABLE public.montagem_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "montagem_avaliacoes_select" ON public.montagem_avaliacoes
  FOR SELECT USING (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "montagem_avaliacoes_insert" ON public.montagem_avaliacoes
  FOR INSERT WITH CHECK (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "montagem_avaliacoes_update" ON public.montagem_avaliacoes
  FOR UPDATE USING (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

CREATE POLICY "montagem_avaliacoes_delete" ON public.montagem_avaliacoes
  FOR DELETE USING (
    loja_id = public.current_loja_id()
    OR public.is_franqueador()
  );

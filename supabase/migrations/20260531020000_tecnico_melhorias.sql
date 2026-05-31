-- ============ Técnico: Agendamentos e Fotos ============

-- 1. Tabela de agendamentos de medição/conferência
CREATE TABLE IF NOT EXISTS public.tecnico_agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  responsavel_id UUID REFERENCES auth.users(id),
  tipo TEXT NOT NULL DEFAULT 'medicao' CHECK (tipo IN ('medicao', 'conferencia')),
  data_agendada DATE NOT NULL,
  horario TEXT,
  endereco TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'realizado', 'cancelado')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tecnico_agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tecnico_agendamentos_select" ON public.tecnico_agendamentos
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "tecnico_agendamentos_insert" ON public.tecnico_agendamentos
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "tecnico_agendamentos_update" ON public.tecnico_agendamentos
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "tecnico_agendamentos_delete" ON public.tecnico_agendamentos
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE INDEX IF NOT EXISTS idx_tecnico_agendamentos_data ON public.tecnico_agendamentos(data_agendada);
CREATE INDEX IF NOT EXISTS idx_tecnico_agendamentos_contrato ON public.tecnico_agendamentos(contrato_id);

-- 2. Tabela de fotos com anotações
CREATE TABLE IF NOT EXISTS public.tecnico_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  ambiente_id UUID REFERENCES public.contrato_ambientes(id) ON DELETE SET NULL,
  loja_id UUID NOT NULL DEFAULT (current_loja_id()),
  etapa TEXT NOT NULL DEFAULT 'medicao' CHECK (etapa IN ('medicao', 'conferencia')),
  url TEXT NOT NULL,
  storage_path TEXT,
  anotacao TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tecnico_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tecnico_fotos_select" ON public.tecnico_fotos
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "tecnico_fotos_insert" ON public.tecnico_fotos
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "tecnico_fotos_update" ON public.tecnico_fotos
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE POLICY "tecnico_fotos_delete" ON public.tecnico_fotos
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR loja_id = current_loja_id()
  );

CREATE INDEX IF NOT EXISTS idx_tecnico_fotos_contrato ON public.tecnico_fotos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_tecnico_fotos_ambiente ON public.tecnico_fotos(ambiente_id);

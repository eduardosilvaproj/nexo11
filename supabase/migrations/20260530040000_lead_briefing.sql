-- ============ Briefing de Leads (anotações + áudio + IA) ============

-- Tabela de anotações/briefings do lead
CREATE TABLE IF NOT EXISTS public.lead_anotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'audio', 'resumo_ia', 'imagem_ia')),
  conteudo TEXT, -- texto digitado ou transcrição
  audio_url TEXT, -- URL do áudio no Storage
  audio_duracao_seg INT, -- duração em segundos
  resumo_ia TEXT, -- resumo gerado pela IA
  imagem_url TEXT, -- URL da imagem gerada
  imagem_prompt TEXT, -- prompt usado para gerar
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lead_anotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_anotacoes_select" ON public.lead_anotacoes
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro','vendedor'])
  );

CREATE POLICY "lead_anotacoes_insert" ON public.lead_anotacoes
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente','financeiro','vendedor'])
  );

CREATE POLICY "lead_anotacoes_delete" ON public.lead_anotacoes
  FOR DELETE TO authenticated USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'franqueador'::app_role)
    OR has_role_on_loja(auth.uid(), loja_id, ARRAY['admin','gerente'])
  );

CREATE INDEX idx_lead_anotacoes_lead ON public.lead_anotacoes(lead_id);

-- Storage bucket para áudios de briefing
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-audios', 'lead-audios', false)
ON CONFLICT (id) DO NOTHING;

-- Policy para upload/download de áudios
CREATE POLICY "lead_audios_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lead-audios');

CREATE POLICY "lead_audios_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lead-audios');

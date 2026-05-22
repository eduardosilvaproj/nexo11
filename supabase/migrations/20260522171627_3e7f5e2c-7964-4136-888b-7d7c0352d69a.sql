-- Tabela de acompanhamento de módulos
CREATE TABLE public.acompanhamento_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  area text,
  ordem integer DEFAULT 0,
  status text NOT NULL DEFAULT 'nao_iniciado',
  percentual integer NOT NULL DEFAULT 0,
  aprovado boolean NOT NULL DEFAULT false,
  aprovado_em timestamptz,
  aprovado_por uuid REFERENCES auth.users(id),
  funcionalidades_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  processos_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ok_items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  revisar_items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  proximos_passos_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  anotacoes_internas text,
  print_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.acompanhamento_modulos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Somente admin pode ver e manipular
CREATE POLICY "Admins can manage modules" 
ON public.acompanhamento_modulos 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.acompanhamento_modulos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Seed inicial
INSERT INTO public.acompanhamento_modulos (slug, nome, area, ordem) VALUES
('dashboard', 'Dashboard', 'Início', 1),
('comercial', 'Comercial', 'Operação', 2),
('clientes', 'Clientes', 'Operação', 3),
('tecnico', 'Técnico', 'Operação', 4),
('producao', 'Produção', 'Operação', 5),
('logistica', 'Logística', 'Operação', 6),
('montagem', 'Montagem', 'Operação', 7),
('pos-venda', 'Pós-venda', 'Operação', 8),
('mensagens', 'Mensagens', 'Operação', 9),
('dre', 'DRE', 'Gestão', 10),
('financeiro', 'Financeiro', 'Gestão', 11),
('comissoes', 'Comissões', 'Gestão', 12),
('compras', 'Compras', 'Gestão', 13),
('equipe', 'Equipe', 'Gestão', 14),
('lojas', 'Lojas', 'Gestão', 15),
('analytics', 'Analytics', 'Inteligência', 16),
('integracoes', 'Integrações', 'Inteligência', 17),
('cond-pagamento', 'Cond. Pagamento', 'Gestão', 18),
('fornecedores', 'Fornecedores', 'Gestão', 19),
('estimativa-pdf', 'Estimativa PDF', 'Inteligência', 20),
('portal-cliente', 'Portal do Cliente', 'Inteligência', 21),
('acompanhamento', 'Acompanhamento', 'Inteligência', 22);

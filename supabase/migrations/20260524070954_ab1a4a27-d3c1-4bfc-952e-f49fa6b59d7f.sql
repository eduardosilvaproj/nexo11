-- Create communication history table
CREATE TABLE public.cliente_comunicacoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
    portal_token_id UUID REFERENCES portal_tokens(id) ON DELETE SET NULL,
    canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'email', 'sms', 'manual')),
    tipo TEXT NOT NULL CHECK (tipo IN ('portal_link', 'documento', 'assinatura_pendente', 'entrega_agendada', 'montagem_agendada', 'pos_venda', 'aviso_geral')),
    destinatario TEXT NOT NULL,
    assunto TEXT,
    mensagem TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'preparado' CHECK (status IN ('preparado', 'enviado', 'falhou', 'entregue', 'lido')),
    erro TEXT,
    enviado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    enviado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cliente_comunicacoes ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_cliente_comunicacoes_loja ON public.cliente_comunicacoes(loja_id);
CREATE INDEX idx_cliente_comunicacoes_contrato ON public.cliente_comunicacoes(contrato_id);
CREATE INDEX idx_cliente_comunicacoes_cliente ON public.cliente_comunicacoes(cliente_id);

-- RLS Policies
CREATE POLICY "Comunicações visíveis por loja" 
ON public.cliente_comunicacoes 
FOR SELECT 
TO authenticated 
USING (
    loja_id IN (SELECT id FROM lojas WHERE id = loja_id) -- Simplified check, assuming helper function exists or standard store RLS
    OR has_role(auth.uid(), 'franqueador')
);

-- Note: Using existing helper functions if they exist in the project for store access
-- Replacing with common pattern if contract_da_loja exists:
DROP POLICY "Comunicações visíveis por loja" ON public.cliente_comunicacoes;
CREATE POLICY "Comunicações visíveis por loja" 
ON public.cliente_comunicacoes 
FOR SELECT 
TO authenticated 
USING (
    (contrato_id IS NOT NULL AND contrato_da_loja(contrato_id))
    OR (loja_id IN (SELECT l.id FROM lojas l JOIN usuarios u ON u.loja_id = l.id WHERE u.id = auth.uid()))
    OR has_role(auth.uid(), 'franqueador')
);

CREATE POLICY "Inserir comunicações por papéis permitidos" 
ON public.cliente_comunicacoes 
FOR INSERT 
TO authenticated 
WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente') OR has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'pos_venda'))
);

-- Trigger for updated_at
CREATE TRIGGER update_cliente_comunicacoes_updated_at
BEFORE UPDATE ON public.cliente_comunicacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Register events helper if needed
-- We already have registrar_evento_contrato from previous turns usually, but let's ensure it's used via code.

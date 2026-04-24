-- Tabela de mensagens do chat do contrato
CREATE TABLE public.contract_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('cliente', 'equipe')),
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contract_messages ENABLE ROW LEVEL SECURITY;

-- Política para Clientes (Anon via portal token)
CREATE POLICY "Clientes podem ler mensagens de seu contrato" 
ON public.contract_messages 
FOR SELECT 
TO anon
USING (contract_id = portal_token_contrato_id());

CREATE POLICY "Clientes podem enviar mensagens para seu contrato" 
ON public.contract_messages 
FOR INSERT 
TO anon
WITH CHECK (
    contract_id = portal_token_contrato_id() 
    AND sender_type = 'cliente'
);

-- Política para Equipe Interna (Autenticados)
CREATE POLICY "Equipe pode ler mensagens de contratos permitidos" 
ON public.contract_messages 
FOR SELECT 
TO authenticated
USING (
    contrato_da_loja(contract_id) 
    OR has_role(auth.uid(), 'franqueador'::app_role)
);

CREATE POLICY "Equipe pode enviar mensagens para contratos permitidos" 
ON public.contract_messages 
FOR INSERT 
TO authenticated
WITH CHECK (
    (contrato_da_loja(contract_id) OR has_role(auth.uid(), 'franqueador'::app_role))
    AND sender_type = 'equipe'
);

CREATE POLICY "Equipe pode marcar como lida" 
ON public.contract_messages 
FOR UPDATE 
TO authenticated
USING (contrato_da_loja(contract_id))
WITH CHECK (contrato_da_loja(contract_id));

-- Index para performance
CREATE INDEX idx_contract_messages_contract_id ON public.contract_messages(contract_id);
CREATE INDEX idx_contract_messages_created_at ON public.contract_messages(created_at);

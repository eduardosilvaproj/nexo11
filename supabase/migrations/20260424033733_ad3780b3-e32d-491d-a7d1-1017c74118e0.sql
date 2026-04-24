-- Create chat_mensagens table
CREATE TABLE public.chat_mensagens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    remetente_tipo TEXT NOT NULL CHECK (remetente_tipo IN ('cliente', 'equipe')),
    remetente_nome TEXT NOT NULL,
    remetente_id UUID,
    mensagem TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

-- Index for faster queries on contract messages
CREATE INDEX idx_chat_mensagens_contrato_id ON public.chat_mensagens(contrato_id);

-- Simple policies to allow reading and writing
-- In a real production scenario, these would be more restricted based on auth.uid() or specific tokens
CREATE POLICY "Leitura de mensagens permitida" ON public.chat_mensagens
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Inserção de mensagens permitida" ON public.chat_mensagens
    FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Atualização de leitura permitida" ON public.chat_mensagens
    FOR UPDATE TO authenticated, anon USING (true);
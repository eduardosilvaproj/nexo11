-- Add attachment columns to chat_mensagens
ALTER TABLE public.chat_mensagens 
ADD COLUMN anexo_url TEXT,
ADD COLUMN anexo_nome TEXT,
ADD COLUMN anexo_tipo TEXT;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-anexos', 'chat-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
CREATE POLICY "Acesso público aos anexos do chat" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat-anexos');

CREATE POLICY "Upload de anexos permitido para todos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chat-anexos');

CREATE POLICY "Exclusão de anexos permitida para todos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'chat-anexos');
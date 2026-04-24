CREATE TYPE status_solicitacao AS ENUM ('pendente', 'aprovado', 'reprovado');

CREATE TABLE public.solicitacoes_desconto (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    orcamento_id UUID REFERENCES public.orcamentos(id),
    vendedor_id UUID REFERENCES auth.users(id),
    status status_solicitacao NOT NULL DEFAULT 'pendente',
    percentual_solicitado DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solicitacoes_desconto ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Vendedores podem ver suas solicitações" 
ON public.solicitacoes_desconto 
FOR SELECT 
USING (auth.uid() = vendedor_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Vendedores podem criar solicitações" 
ON public.solicitacoes_desconto 
FOR INSERT 
WITH CHECK (auth.uid() = vendedor_id);

CREATE POLICY "Gerentes podem atualizar solicitações" 
ON public.solicitacoes_desconto 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_solicitacoes_desconto_updated_at
BEFORE UPDATE ON public.solicitacoes_desconto
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Create table for conference data if it doesn't exist
CREATE TABLE IF NOT EXISTS public.conferencia_ambientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    ambiente_id UUID NOT NULL REFERENCES public.contrato_ambientes(id) ON DELETE CASCADE,
    loja_id UUID NOT NULL,
    custo_original DECIMAL(12,2),
    custo_conferencia DECIMAL(12,2),
    variacao_percentual DECIMAL(12,2),
    status TEXT NOT NULL DEFAULT 'em_conferencia',
    xml_conferencia_raw TEXT,
    aprovado_por UUID REFERENCES auth.users(id),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(contrato_id, ambiente_id)
);

-- Enable RLS
ALTER TABLE public.conferencia_ambientes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Conferencia data is viewable by authorized users" 
ON public.conferencia_ambientes 
FOR SELECT 
USING (true);

CREATE POLICY "Authorized users can manage conference data" 
ON public.conferencia_ambientes 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conferencia_ambientes_updated_at ON public.conferencia_ambientes;
CREATE TRIGGER update_conferencia_ambientes_updated_at
BEFORE UPDATE ON public.conferencia_ambientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

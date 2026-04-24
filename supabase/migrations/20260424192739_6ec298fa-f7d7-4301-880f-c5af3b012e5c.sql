-- Ensure acao has a default value if not provided
ALTER TABLE public.contrato_logs 
ALTER COLUMN acao SET DEFAULT 'acao_sistema';

-- If there are any existing null values (though the constraint should have prevented them), 
-- you might want to fill them, but for now we just fix the constraint for future inserts.

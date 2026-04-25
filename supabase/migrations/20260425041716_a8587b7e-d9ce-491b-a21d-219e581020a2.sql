-- Add the new column as an array of strings (using jsonb for flexibility and consistency with medicao_fotos)
ALTER TABLE public.contrato_ambientes ADD COLUMN IF NOT EXISTS medicao_scans JSONB DEFAULT '[]'::jsonb;

-- Optional: Migrate existing single scan data to the new array format if the old column exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contrato_ambientes' AND column_name = 'medicao_scan_url') THEN
        UPDATE public.contrato_ambientes 
        SET medicao_scans = jsonb_build_array(medicao_scan_url)
        WHERE medicao_scan_url IS NOT NULL AND (medicao_scans IS NULL OR medicao_scans = '[]'::jsonb);
    END IF;
END $$;
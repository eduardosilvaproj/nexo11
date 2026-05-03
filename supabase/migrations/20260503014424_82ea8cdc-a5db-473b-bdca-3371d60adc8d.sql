-- Create a public bucket for estimates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('estimativas', 'estimativas', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to the files (needed for Gemini to access via public URL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public Access for Estimativas'
    ) THEN
        CREATE POLICY "Public Access for Estimativas" ON storage.objects
        FOR SELECT USING (bucket_id = 'estimativas');
    END IF;
END
$$;

-- Policy to allow authenticated users to upload files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Authenticated users can upload Estimativas'
    ) THEN
        CREATE POLICY "Authenticated users can upload Estimativas" ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'estimativas' 
            AND auth.role() = 'authenticated'
        );
    END IF;
END
$$;
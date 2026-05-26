CREATE TABLE public.estimativas_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text UNIQUE NOT NULL,
  resultado jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estimativas_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
ON public.estimativas_cache FOR ALL
USING (true) WITH CHECK (true);
CREATE TABLE public.app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.app_state TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_state TO authenticated;
GRANT ALL ON public.app_state TO service_role;

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_state_select" ON public.app_state FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app_state_insert" ON public.app_state FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "app_state_update" ON public.app_state FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.app_state (id, data) VALUES ('main', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_state;
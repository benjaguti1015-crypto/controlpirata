-- Pedidos online desactivados: el público no tiene ningún acceso a la base de datos.
-- Idempotente: deja app_state cerrado aunque la migración anterior haya fallado a medias.

DROP FUNCTION IF EXISTS public.crear_pedido_online(text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.catalogo_publico();

DROP POLICY IF EXISTS "app_state_select" ON public.app_state;
DROP POLICY IF EXISTS "app_state_insert" ON public.app_state;
DROP POLICY IF EXISTS "app_state_update" ON public.app_state;

REVOKE ALL ON public.app_state FROM anon;
REVOKE ALL ON public.app_state FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.app_state TO authenticated;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Correo fijo de la cuenta admin (contraseña compartida del panel)
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'admin@reypirata.app'
$$;

DROP POLICY IF EXISTS "app_state_admin_select" ON public.app_state;
DROP POLICY IF EXISTS "app_state_admin_insert" ON public.app_state;
DROP POLICY IF EXISTS "app_state_admin_update" ON public.app_state;

CREATE POLICY "app_state_admin_select" ON public.app_state
  FOR SELECT TO authenticated USING (public.es_admin());
CREATE POLICY "app_state_admin_insert" ON public.app_state
  FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY "app_state_admin_update" ON public.app_state
  FOR UPDATE TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

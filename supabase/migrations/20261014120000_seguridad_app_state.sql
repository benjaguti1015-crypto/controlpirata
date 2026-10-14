-- Seguridad: app_state deja de ser pública.
-- Solo la cuenta admin (contraseña compartida del panel) puede leer y escribir.
-- El público solo puede ver el catálogo y crear pedidos mediante funciones controladas.

-- 1. Quitar las políticas abiertas y los permisos de anon
DROP POLICY IF EXISTS "app_state_select" ON public.app_state;
DROP POLICY IF EXISTS "app_state_insert" ON public.app_state;
DROP POLICY IF EXISTS "app_state_update" ON public.app_state;

REVOKE ALL ON public.app_state FROM anon;
REVOKE ALL ON public.app_state FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.app_state TO authenticated;

-- Correo fijo de la cuenta admin. Se crea en Lovable Cloud -> Users.
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'admin@reypirata.app'
$$;

CREATE POLICY "app_state_admin_select" ON public.app_state
  FOR SELECT TO authenticated USING (public.es_admin());
CREATE POLICY "app_state_admin_insert" ON public.app_state
  FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY "app_state_admin_update" ON public.app_state
  FOR UPDATE TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

-- 2. Catálogo público: solo id, nombre, precio y stock (sin costos ni datos de clientes)
CREATE OR REPLACE FUNCTION public.catalogo_publico()
RETURNS TABLE (id text, nombre text, precio numeric, stock numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p ->> 'id', p ->> 'nombre', (p ->> 'precio')::numeric, (p ->> 'stock')::numeric
  FROM public.app_state s,
       jsonb_array_elements(coalesce(s.data -> 'productos', '[]'::jsonb)) p
  WHERE s.id = 'main'
    AND jsonb_typeof(p -> 'id') = 'string'
    AND jsonb_typeof(p -> 'nombre') = 'string'
    AND jsonb_typeof(p -> 'precio') = 'number'
    AND jsonb_typeof(p -> 'stock') = 'number'
$$;

REVOKE ALL ON FUNCTION public.catalogo_publico() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalogo_publico() TO anon, authenticated;

-- 3. Pedido online: valida datos, usa precios del servidor y descuenta stock de forma atómica
CREATE OR REPLACE FUNCTION public.crear_pedido_online(
  p_cliente text,
  p_telefono text,
  p_fecha text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoy date := (now() AT TIME ZONE 'America/Santiago')::date;
  v_data jsonb;
  v_updated timestamptz;
  v_productos jsonb;
  v_pedidos jsonb;
  v_item jsonb;
  v_prod jsonb;
  v_idx int;
  v_cant numeric;
  v_items_final jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_pendientes int;
  v_id text := gen_random_uuid()::text;
BEGIN
  p_cliente := btrim(coalesce(p_cliente, ''));
  p_telefono := btrim(coalesce(p_telefono, ''));

  IF length(p_cliente) < 2 OR length(p_cliente) > 80 THEN
    RAISE EXCEPTION 'Ingresa un nombre válido';
  END IF;
  IF p_telefono !~ '^\+?[0-9 -]{8,20}$' THEN
    RAISE EXCEPTION 'Ingresa un teléfono válido';
  END IF;
  IF coalesce(p_fecha, '') !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Fecha inválida';
  END IF;
  IF p_fecha::date < v_hoy OR p_fecha::date > v_hoy + 60 THEN
    RAISE EXCEPTION 'La fecha debe ser entre hoy y los próximos 60 días';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 20 THEN
    RAISE EXCEPTION 'El pedido no tiene productos válidos';
  END IF;

  -- Bloquea la fila para que dos pedidos simultáneos no vendan el mismo stock
  SELECT data, updated_at INTO v_data, v_updated
  FROM public.app_state WHERE id = 'main' FOR UPDATE;
  IF v_data IS NULL THEN
    RAISE EXCEPTION 'El catálogo no está disponible';
  END IF;

  v_productos := coalesce(v_data -> 'productos', '[]'::jsonb);
  v_pedidos := coalesce(v_data -> 'pedidos', '[]'::jsonb);

  -- Anti-spam: máximo 3 pedidos pendientes por teléfono
  SELECT count(*) INTO v_pendientes
  FROM jsonb_array_elements(v_pedidos) x
  WHERE x ->> 'telefono' = p_telefono AND x ->> 'estado' = 'pendiente';
  IF v_pendientes >= 3 THEN
    RAISE EXCEPTION 'Ya tienes pedidos pendientes. Escríbenos por WhatsApp';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(v_item -> 'cantidad') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'Cantidad inválida';
    END IF;
    v_cant := (v_item ->> 'cantidad')::numeric;
    IF v_cant <> trunc(v_cant) OR v_cant < 1 OR v_cant > 50 THEN
      RAISE EXCEPTION 'Cantidad inválida';
    END IF;

    SELECT t.ord - 1, t.elem INTO v_idx, v_prod
    FROM jsonb_array_elements(v_productos) WITH ORDINALITY AS t(elem, ord)
    WHERE t.elem ->> 'id' = v_item ->> 'productoId'
    LIMIT 1;
    IF v_prod IS NULL OR jsonb_typeof(v_prod -> 'stock') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'Un producto ya no está disponible';
    END IF;
    IF (v_prod ->> 'stock')::numeric < v_cant THEN
      RAISE EXCEPTION 'No queda stock suficiente de %', v_prod ->> 'nombre';
    END IF;

    v_productos := jsonb_set(
      v_productos,
      ARRAY[v_idx::text, 'stock'],
      to_jsonb((v_prod ->> 'stock')::numeric - v_cant)
    );
    v_items_final := v_items_final || jsonb_build_array(jsonb_build_object(
      'productoId', v_prod ->> 'id',
      'nombre', v_prod ->> 'nombre',
      'cantidad', v_cant,
      'precio', v_prod -> 'precio',
      'costo', coalesce(v_prod -> 'costo', '0'::jsonb)
    ));
    v_total := v_total + (v_prod ->> 'precio')::numeric * v_cant;
  END LOOP;

  v_pedidos := jsonb_build_array(jsonb_build_object(
    'id', v_id,
    'cliente', p_cliente,
    'telefono', p_telefono,
    'fecha', p_fecha,
    'items', v_items_final,
    'estado', 'pendiente'
  )) || v_pedidos;

  -- updated_at siempre mayor al anterior para que el panel no ignore el cambio
  UPDATE public.app_state
  SET data = jsonb_set(jsonb_set(v_data, '{productos}', v_productos), '{pedidos}', v_pedidos),
      updated_at = greatest(now(), coalesce(v_updated, now()) + interval '1 millisecond')
  WHERE id = 'main';

  RETURN jsonb_build_object('id', v_id, 'total', v_total, 'items', v_items_final);
END;
$$;

REVOKE ALL ON FUNCTION public.crear_pedido_online(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_pedido_online(text, text, text, jsonb) TO anon, authenticated;

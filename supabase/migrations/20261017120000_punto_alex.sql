-- Punto de venta "Chico Alex".
-- Alex inicia sesión con su propia cuenta (alex@reypirata.app) y NO puede leer app_state.
-- Solo usa estas funciones: ver su stock/ventas/sueldo, vender y deshacer una venta.
-- Su stock vive en productos[].alex y sus ventas en ventasAlex dentro de app_state.

CREATE OR REPLACE FUNCTION public.es_alex()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'alex@reypirata.app'
$$;

-- Lo que ve Alex: su stock, sus ventas aún no liquidadas y su sueldo pendiente
CREATE OR REPLACE FUNCTION public.alex_panel()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data jsonb;
  v_ventas jsonb;
BEGIN
  IF NOT (public.es_alex() OR public.es_admin()) THEN
    RAISE EXCEPTION 'Sin acceso';
  END IF;

  SELECT data INTO v_data FROM public.app_state WHERE id = 'main';
  v_data := coalesce(v_data, '{}'::jsonb);

  SELECT coalesce(jsonb_agg(v ORDER BY o), '[]'::jsonb) INTO v_ventas
  FROM jsonb_array_elements(coalesce(v_data -> 'ventasAlex', '[]'::jsonb)) WITH ORDINALITY AS t(v, o)
  WHERE coalesce((v ->> 'sueldoPagado')::boolean, false) = false;

  RETURN jsonb_build_object(
    'stock', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'productoId', p ->> 'id',
        'nombre', p ->> 'nombre',
        'precio', p -> 'precio',
        'cantidad', p -> 'alex'
      )), '[]'::jsonb)
      FROM jsonb_array_elements(coalesce(v_data -> 'productos', '[]'::jsonb)) p
      WHERE jsonb_typeof(p -> 'alex') = 'number' AND (p ->> 'alex')::numeric > 0
    ),
    'ventas', v_ventas
  );
END;
$$;

-- Venta de Alex: descuenta su stock, registra la venta y la suma a los ingresos del negocio
CREATE OR REPLACE FUNCTION public.alex_vender(p_cliente text, p_items jsonb, p_metodo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data jsonb;
  v_updated timestamptz;
  v_productos jsonb;
  v_item jsonb;
  v_prod jsonb;
  v_idx int;
  v_cant numeric;
  v_items_pedido jsonb := '[]'::jsonb;
  v_items_venta jsonb := '[]'::jsonb;
  v_venta_id text := gen_random_uuid()::text;
  v_pedido_id text := gen_random_uuid()::text;
  v_cliente text := btrim(coalesce(p_cliente, ''));
BEGIN
  IF NOT public.es_alex() THEN
    RAISE EXCEPTION 'Sin acceso';
  END IF;
  IF length(v_cliente) > 60 THEN
    RAISE EXCEPTION 'El nombre del cliente es muy largo';
  END IF;
  IF p_metodo IS NULL OR p_metodo NOT IN ('efectivo', 'transferencia') THEN
    RAISE EXCEPTION 'Elige efectivo o transferencia';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 20 THEN
    RAISE EXCEPTION 'Agrega al menos una galleta';
  END IF;

  SELECT data, updated_at INTO v_data, v_updated
  FROM public.app_state WHERE id = 'main' FOR UPDATE;
  IF v_data IS NULL THEN
    RAISE EXCEPTION 'Datos no disponibles';
  END IF;
  v_productos := coalesce(v_data -> 'productos', '[]'::jsonb);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(v_item -> 'cantidad') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'Cantidad inválida';
    END IF;
    v_cant := (v_item ->> 'cantidad')::numeric;
    IF v_cant <> trunc(v_cant) OR v_cant < 1 OR v_cant > 100 THEN
      RAISE EXCEPTION 'Cantidad inválida';
    END IF;

    SELECT t.ord - 1, t.elem INTO v_idx, v_prod
    FROM jsonb_array_elements(v_productos) WITH ORDINALITY AS t(elem, ord)
    WHERE t.elem ->> 'id' = v_item ->> 'productoId'
    LIMIT 1;
    IF v_prod IS NULL OR jsonb_typeof(v_prod -> 'alex') IS DISTINCT FROM 'number'
       OR (v_prod ->> 'alex')::numeric < v_cant THEN
      RAISE EXCEPTION 'No te quedan suficientes de %', coalesce(v_prod ->> 'nombre', 'esa galleta');
    END IF;

    v_productos := jsonb_set(
      v_productos, ARRAY[v_idx::text, 'alex'], to_jsonb((v_prod ->> 'alex')::numeric - v_cant)
    );
    v_items_pedido := v_items_pedido || jsonb_build_array(jsonb_build_object(
      'productoId', v_prod ->> 'id',
      'nombre', v_prod ->> 'nombre',
      'cantidad', v_cant,
      'precio', v_prod -> 'precio',
      'costo', coalesce(v_prod -> 'costo', '0'::jsonb)
    ));
    v_items_venta := v_items_venta || jsonb_build_array(jsonb_build_object(
      'productoId', v_prod ->> 'id',
      'nombre', v_prod ->> 'nombre',
      'cantidad', v_cant,
      'precio', v_prod -> 'precio'
    ));
  END LOOP;

  v_data := jsonb_set(v_data, '{productos}', v_productos);
  v_data := jsonb_set(v_data, '{pedidos}', jsonb_build_array(jsonb_build_object(
    'id', v_pedido_id,
    'cliente', 'Alex · ' || coalesce(nullif(v_cliente, ''), 'Venta'),
    'fecha', to_char(now() AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD'),
    'items', v_items_pedido,
    'estado', 'entregado'
  )) || coalesce(v_data -> 'pedidos', '[]'::jsonb));
  v_data := jsonb_set(v_data, '{ventasAlex}', jsonb_build_array(jsonb_build_object(
    'id', v_venta_id,
    'pedidoId', v_pedido_id,
    'fecha', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'cliente', v_cliente,
    'items', v_items_venta,
    'metodoPago', p_metodo,
    'sueldoPagado', false
  )) || coalesce(v_data -> 'ventasAlex', '[]'::jsonb));

  UPDATE public.app_state
  SET data = v_data,
      updated_at = greatest(now(), coalesce(v_updated, now()) + interval '1 millisecond')
  WHERE id = 'main';

  RETURN jsonb_build_object('id', v_venta_id);
END;
$$;

-- Deshacer una venta de Alex: devuelve las galletas a su stock y quita el ingreso
CREATE OR REPLACE FUNCTION public.alex_deshacer(p_venta_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data jsonb;
  v_updated timestamptz;
  v_venta jsonb;
  v_productos jsonb;
  v_item jsonb;
  v_idx int;
  v_actual numeric;
BEGIN
  IF NOT public.es_alex() THEN
    RAISE EXCEPTION 'Sin acceso';
  END IF;

  SELECT data, updated_at INTO v_data, v_updated
  FROM public.app_state WHERE id = 'main' FOR UPDATE;
  IF v_data IS NULL THEN
    RAISE EXCEPTION 'Datos no disponibles';
  END IF;

  SELECT v INTO v_venta
  FROM jsonb_array_elements(coalesce(v_data -> 'ventasAlex', '[]'::jsonb)) v
  WHERE v ->> 'id' = p_venta_id
  LIMIT 1;
  IF v_venta IS NULL THEN
    RAISE EXCEPTION 'Esa venta ya no existe';
  END IF;
  IF coalesce((v_venta ->> 'sueldoPagado')::boolean, false) THEN
    RAISE EXCEPTION 'Esa venta ya se pagó en tu sueldo; pídele al dueño que la corrija';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(v_data -> 'pedidos', '[]'::jsonb)) p
    WHERE p ->> 'id' = v_venta ->> 'pedidoId'
  ) THEN
    RAISE EXCEPTION 'El día ya se cerró; pídele al dueño que la corrija';
  END IF;

  v_productos := coalesce(v_data -> 'productos', '[]'::jsonb);
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(v_venta -> 'items', '[]'::jsonb)) LOOP
    v_idx := NULL;
    SELECT t.ord - 1, coalesce((t.elem ->> 'alex')::numeric, 0) INTO v_idx, v_actual
    FROM jsonb_array_elements(v_productos) WITH ORDINALITY AS t(elem, ord)
    WHERE t.elem ->> 'id' = v_item ->> 'productoId'
    LIMIT 1;
    IF v_idx IS NOT NULL THEN
      v_productos := jsonb_set(
        v_productos, ARRAY[v_idx::text, 'alex'],
        to_jsonb(v_actual + (v_item ->> 'cantidad')::numeric)
      );
    END IF;
  END LOOP;

  v_data := jsonb_set(v_data, '{productos}', v_productos);
  v_data := jsonb_set(v_data, '{pedidos}', (
    SELECT coalesce(jsonb_agg(p ORDER BY o), '[]'::jsonb)
    FROM jsonb_array_elements(coalesce(v_data -> 'pedidos', '[]'::jsonb)) WITH ORDINALITY AS t(p, o)
    WHERE p ->> 'id' IS DISTINCT FROM v_venta ->> 'pedidoId'
  ));
  v_data := jsonb_set(v_data, '{ventasAlex}', (
    SELECT coalesce(jsonb_agg(v ORDER BY o), '[]'::jsonb)
    FROM jsonb_array_elements(coalesce(v_data -> 'ventasAlex', '[]'::jsonb)) WITH ORDINALITY AS t(v, o)
    WHERE v ->> 'id' IS DISTINCT FROM p_venta_id
  ));

  UPDATE public.app_state
  SET data = v_data,
      updated_at = greatest(now(), coalesce(v_updated, now()) + interval '1 millisecond')
  WHERE id = 'main';
END;
$$;

REVOKE ALL ON FUNCTION public.alex_panel() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.alex_vender(text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.alex_deshacer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alex_panel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.alex_vender(text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alex_deshacer(text) TO authenticated;

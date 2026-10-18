import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fechaChile } from "@/lib/fecha";
import { Sincronizador, uid, type EstadoSync } from "@/lib/sync";

export type Producto = {
  id: string;
  nombre: string;
  costo: number;
  precio: number;
  stock: number;
  millaray?: number | undefined;
  alex?: number | undefined; // galletas en poder de Chico Alex
  receta?: Receta | undefined;
};

export type Insumo = {
  id: string;
  nombre: string;
  stock: number;
  unidad: string;
  minimo: number;
};

export type RecetaItem = { insumoId: string; cantidad: number };

export type Receta = { rendimiento: number; items: RecetaItem[] };

export type ItemPedido = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  costo: number;
};

export type Pedido = {
  id: string;
  cliente: string;
  telefono: string | undefined;
  fecha: string;
  items: ItemPedido[];
  estado: "pendiente" | "entregado";
  descuento?: number | undefined; // Porcentaje de descuento opcional (ej: 50 para 50%)
  pagado?: boolean | undefined; // undefined = pedido antiguo, se considera pagado
  canal?: "presencial" | undefined;
};

export type VentaMillaray = {
  id: string;
  cliente: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  metodoPago: "efectivo" | "transferencia";
  pagado: boolean;
  fecha: string;
  descuento?: number | undefined; // Descuento opcional en ventas de Millaray
};

export type Cierre = {
  id: string;
  fecha: string;
  ingresos: number;
  costos: number;
  utilidad: number;
  pedidos: number;
  unidades: number;
  detalle?: ItemPedido[] | undefined;
};

export type VentaAlex = {
  id: string;
  pedidoId: string; // pedido que la suma a los ingresos del negocio
  fecha: string;
  cliente: string;
  items: { productoId: string; nombre: string; cantidad: number; precio: number }[];
  metodoPago: "efectivo" | "transferencia";
  sueldoPagado: boolean;
};

/** Sueldo de Alex por cada galleta vendida. */
export const SUELDO_POR_GALLETA = 500;

export const unidadesVentaAlex = (v: VentaAlex) => v.items.reduce((s, i) => s + i.cantidad, 0);
export const totalVentaAlex = (v: VentaAlex) => v.items.reduce((s, i) => s + i.precio * i.cantidad, 0);

type Data = {
  productos: Producto[];
  pedidos: Pedido[];
  cierres: Cierre[];
  insumos: Insumo[];
  ventasMillaray: VentaMillaray[];
  ventasAlex: VentaAlex[];
};

const KEY = "dulces-rey-pirata-v1";
const STATE_ID = "main";
// Cuenta única del panel: la contraseña compartida se crea en Lovable Cloud -> Users.
// Debe coincidir con public.es_admin() en supabase/migrations.
const ADMIN_EMAIL = "admin@reypirata.app";
// Cuenta de Chico Alex: solo accede a su panel (/alex). Debe coincidir con public.es_alex().
const ALEX_EMAIL = "alex@reypirata.app";

const isProducto = (v: unknown): v is Producto => {
  const p = v as Producto;
  return (
    !!p &&
    typeof p.id === "string" &&
    typeof p.nombre === "string" &&
    typeof p.costo === "number" &&
    typeof p.precio === "number" &&
    typeof p.stock === "number"
  );
};

const isInsumo = (v: unknown): v is Insumo => {
  const i = v as Insumo;
  return (
    !!i &&
    typeof i.id === "string" &&
    typeof i.nombre === "string" &&
    typeof i.stock === "number" &&
    typeof i.unidad === "string" &&
    typeof i.minimo === "number"
  );
};

const isPedido = (v: unknown): v is Pedido => {
  const p = v as Pedido;
  return (
    !!p &&
    typeof p.id === "string" &&
    typeof p.cliente === "string" &&
    (p.telefono === undefined || typeof p.telefono === "string") &&
    typeof p.fecha === "string" &&
    Array.isArray(p.items) &&
    (p.estado === "pendiente" || p.estado === "entregado") &&
    (p.descuento === undefined || typeof p.descuento === "number")
  );
};

const isCierre = (v: unknown): v is Cierre => {
  const c = v as Cierre;
  return (
    !!c &&
    typeof c.id === "string" &&
    typeof c.fecha === "string" &&
    typeof c.ingresos === "number" &&
    typeof c.costos === "number" &&
    typeof c.utilidad === "number" &&
    typeof c.pedidos === "number" &&
    typeof c.unidades === "number"
  );
};

const isVentaMillaray = (v: unknown): v is VentaMillaray => {
  const x = v as VentaMillaray;
  return (
    !!x &&
    typeof x.id === "string" &&
    typeof x.cliente === "string" &&
    typeof x.productoId === "string" &&
    typeof x.nombre === "string" &&
    typeof x.cantidad === "number" &&
    typeof x.precio === "number" &&
    (x.metodoPago === "efectivo" || x.metodoPago === "transferencia") &&
    typeof x.pagado === "boolean" &&
    typeof x.fecha === "string" &&
    (x.descuento === undefined || typeof x.descuento === "number")
  );
};

const isVentaAlex = (v: unknown): v is VentaAlex => {
  const x = v as VentaAlex;
  return (
    !!x &&
    typeof x.id === "string" &&
    typeof x.pedidoId === "string" &&
    typeof x.fecha === "string" &&
    typeof x.cliente === "string" &&
    Array.isArray(x.items) &&
    (x.metodoPago === "efectivo" || x.metodoPago === "transferencia") &&
    typeof x.sueldoPagado === "boolean"
  );
};

const vacio: Data = {
  productos: [],
  pedidos: [],
  cierres: [],
  insumos: [],
  ventasMillaray: [],
  ventasAlex: [],
};

function sanea(raw: unknown): Data {
  const parsed = (raw ?? {}) as Partial<Data>;
  return {
    productos: Array.isArray(parsed.productos) ? parsed.productos.filter(isProducto) : [],
    pedidos: Array.isArray(parsed.pedidos) ? parsed.pedidos.filter(isPedido) : [],
    cierres: Array.isArray(parsed.cierres) ? parsed.cierres.filter(isCierre) : [],
    insumos: Array.isArray(parsed.insumos) ? parsed.insumos.filter(isInsumo) : [],
    ventasMillaray: Array.isArray(parsed.ventasMillaray)
      ? parsed.ventasMillaray.filter(isVentaMillaray)
      : [],
    ventasAlex: Array.isArray(parsed.ventasAlex) ? parsed.ventasAlex.filter(isVentaAlex) : [],
  };
}

function loadLocal(): Data {
  if (typeof window === "undefined") return vacio;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return vacio;
    return sanea(JSON.parse(raw));
  } catch {
    return vacio;
  }
}

function tieneDatos(d: Data) {
  return (
    d.productos.length > 0 ||
    d.pedidos.length > 0 ||
    d.cierres.length > 0 ||
    d.insumos.length > 0
  );
}

type Store = {
  productos: Producto[];
  pedidos: Pedido[];
  cierres: Cierre[];
  insumos: Insumo[];
  ventasMillaray: VentaMillaray[];
  ventasAlex: VentaAlex[];
  hidratado: boolean;
  estadoSync: EstadoSync;
  sesion: boolean | null; // null = verificando
  sesionAlex: boolean | null;
  iniciarSesion: (password: string) => Promise<boolean>;
  iniciarSesionAlex: (password: string) => Promise<boolean>;
  cerrarSesion: () => Promise<void>;
  agregarProducto: (p: Omit<Producto, "id">) => void;
  actualizarProducto: (id: string, p: Omit<Producto, "id">) => void;
  eliminarProducto: (id: string) => void;
  agregarPedido: (
    cliente: string,
    telefono: string,
    fecha: string,
    items: ItemPedido[],
    descuento?: number,
  ) => void;
  actualizarPedido: (
    id: string,
    cliente: string,
    telefono: string,
    fecha: string,
    items: ItemPedido[],
    descuento?: number,
  ) => void;
  entregarPedido: (id: string) => void;
  marcarPedidoPagado: (id: string, pagado?: boolean) => void;
  deshacerEntrega: (id: string) => void;
  registrarVentaRapida: (items: ItemPedido[], cliente: string, pagado: boolean) => void;
  eliminarPedido: (id: string) => void;
  cerrarDia: () => Cierre | null;
  actualizarCierre: (id: string, c: Omit<Cierre, "id">) => void;
  eliminarCierre: (id: string) => void;
  agregarInsumo: (i: Omit<Insumo, "id">) => void;
  actualizarInsumo: (id: string, i: Omit<Insumo, "id">) => void;
  eliminarInsumo: (id: string) => void;
  guardarReceta: (productoId: string, receta: Receta | undefined) => void;
  hornearLote: (productoId: string, unidades: number) => { faltantes: string[] };
  traspasarAMillaray: (productoId: string, cantidad: number) => void;
  devolverDeMillaray: (productoId: string, cantidad: number) => void;
  venderMillaray: (productoId: string, cantidad: number) => void;
  registrarVentaMillaray: (
    cliente: string,
    productoId: string,
    cantidad: number,
    metodoPago: "efectivo" | "transferencia",
    descuento?: number,
  ) => void;
  marcarVentaMillarayPagada: (id: string) => void;
  eliminarVentaMillaray: (id: string) => void;
  traspasarAAlex: (productoId: string, cantidad: number) => void;
  devolverDeAlex: (productoId: string, cantidad: number) => void;
  eliminarVentaAlex: (id: string) => void;
  pagarSueldoAlex: () => void;
};

const StoreContext = createContext<Store | null>(null);

// Lectura y escritura en la nube. Solo escribe si nadie más guardó desde la última lectura.
const backendNube = {
  leer: async () => {
    const { data: row, error } = await supabase
      .from("app_state")
      .select("data, updated_at")
      .eq("id", STATE_ID)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Sin acceso a los datos");
    return { data: sanea(row.data), version: row.updated_at };
  },
  escribir: async (data: Data, base: string, nueva: string) => {
    const { data: filas, error } = await supabase
      .from("app_state")
      .update({ data, updated_at: nueva })
      .eq("id", STATE_ID)
      .eq("updated_at", base)
      .select("updated_at");
    if (error) throw error;
    return filas?.[0]?.updated_at ?? null;
  },
};

let alCambiar: (d: Data) => void = () => {};
let alEstado: (e: EstadoSync) => void = () => {};
const motor = new Sincronizador<Data>(
  backendNube,
  vacio,
  (d) => alCambiar(d),
  (e) => alEstado(e),
);

const cambiar = (aplicar: (d: Data) => Data) => {
  if (!motor.cambiar(aplicar)) toast.error("Espera a que carguen los datos");
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(vacio);
  const [hidratado, setHidratado] = useState(false);
  const [estadoSync, setEstadoSync] = useState<EstadoSync>("ok");
  // undefined = verificando; null = sin sesión
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const sesion = email === undefined ? null : email === ADMIN_EMAIL;
  const sesionAlex = email === undefined ? null : email === ALEX_EMAIL;

  useEffect(() => {
    alCambiar = (d) => {
      setData(d);
      setHidratado(motor.listo);
    };
    alEstado = setEstadoSync;
    return () => {
      alCambiar = () => {};
      alEstado = () => {};
    };
  }, []);

  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data: s }) => setEmail(s.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) =>
      setEmail(s?.user.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Sin sesión de admin la base de datos rechaza todo: no cargar ni escribir.
    if (!sesion) {
      motor.reiniciar();
      return;
    }
    motor.mostrarCopia(loadLocal());
    void motor.refrescar();

    // Al volver a la app (celular en segundo plano, sin señal) traer lo último antes de editar
    const alVolver = () => {
      if (document.visibilityState === "visible") void motor.refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    window.addEventListener("online", alVolver);

    const reintento = window.setInterval(() => {
      if (!motor.listo || motor.hayPendientes) void motor.refrescar();
    }, 10000);

    const avisarSinGuardar = (e: BeforeUnloadEvent) => {
      if (motor.hayPendientes) e.preventDefault();
    };
    window.addEventListener("beforeunload", avisarSinGuardar);

    const channel = supabase
      .channel("app_state_sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_state" },
        (payload) => {
          const ts = (payload.new as { updated_at?: string } | undefined)?.updated_at;
          const propia = motor.versionConfirmada;
          if (ts && propia && Date.parse(ts) === Date.parse(propia)) return; // nuestro propio guardado
          void motor.refrescar();
        },
      )
      .subscribe((estado) => {
        // Al reconectar puede que se haya perdido algún aviso
        if (estado === "SUBSCRIBED") void motor.refrescar();
      });

    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
      window.removeEventListener("online", alVolver);
      window.removeEventListener("beforeunload", avisarSinGuardar);
      window.clearInterval(reintento);
      void supabase.removeChannel(channel);
    };
  }, [sesion]);

  const iniciarSesion = useCallback(async (password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
    return !error;
  }, []);

  const iniciarSesionAlex = useCallback(async (password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: ALEX_EMAIL, password });
    return !error;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  useEffect(() => {
    if (!hidratado || !sesion) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [data, hidratado, sesion]);

  const agregarProducto = useCallback((p: Omit<Producto, "id">) => {
    cambiar((d) => ({ ...d, productos: [...d.productos, { ...p, id: uid() }] }));
  }, []);

  const actualizarProducto = useCallback((id: string, p: Omit<Producto, "id">) => {
    cambiar((d) => ({
      ...d,
      productos: d.productos.map((x) => (x.id === id ? { ...x, ...p, id } : x)),
    }));
  }, []);

  const eliminarProducto = useCallback((id: string) => {
    cambiar((d) => ({ ...d, productos: d.productos.filter((x) => x.id !== id) }));
  }, []);

  const agregarPedido = useCallback(
    (cliente: string, telefono: string, fecha: string, items: ItemPedido[], descuento?: number) => {
      cambiar((d) => {
        const productos = d.productos.map((prod) => {
          const item = items.find((i) => i.productoId === prod.id);
          return item ? { ...prod, stock: prod.stock - item.cantidad } : prod;
        });
        return {
          ...d,
          productos,
          pedidos: [
            { id: uid(), cliente, telefono: telefono.trim() || undefined, fecha, items, estado: "pendiente", descuento },
            ...d.pedidos,
          ],
        };
      });
    },
    [],
  );

  const actualizarPedido = useCallback(
    (id: string, cliente: string, telefono: string, fecha: string, items: ItemPedido[], descuento?: number) => {
      cambiar((d) => {
        const pedidoAnterior = d.pedidos.find((p) => p.id === id);
        if (!pedidoAnterior) return d;

        let productosTemp = [...d.productos];
        if (pedidoAnterior.estado === "pendiente") {
          productosTemp = productosTemp.map((prod) => {
            const itemViejo = pedidoAnterior.items.find((i) => i.productoId === prod.id);
            return itemViejo ? { ...prod, stock: prod.stock + itemViejo.cantidad } : prod;
          });
        }

        const productosFinales = productosTemp.map((prod) => {
          const itemNuevo = items.find((i) => i.productoId === prod.id);
          return itemNuevo
            ? { ...prod, stock: pedidoAnterior.estado === "pendiente" ? prod.stock - itemNuevo.cantidad : prod.stock }
            : prod;
        });

        return {
          ...d,
          productos: productosFinales,
          pedidos: d.pedidos.map((p) =>
            p.id === id
              ? {
                  ...p,
                  cliente: cliente.trim(),
                  telefono: telefono.trim() || undefined,
                  fecha,
                  items,
                  descuento,
                }
              : p,
          ),
        };
      });
    },
    [],
  );

  const entregarPedido = useCallback((id: string) => {
    cambiar((d) => {
      const pedido = d.pedidos.find((p) => p.id === id);
      if (!pedido || pedido.estado === "entregado") return d;
      return {
        ...d,
        pedidos: d.pedidos.map((p) => (p.id === id ? { ...p, estado: "entregado" as const } : p)),
      };
    });
  }, []);

  const marcarPedidoPagado = useCallback((id: string, pagado = true) => {
    cambiar((d) => ({
      ...d,
      pedidos: d.pedidos.map((p) => (p.id === id ? { ...p, pagado } : p)),
    }));
  }, []);

  const deshacerEntrega = useCallback((id: string) => {
    cambiar((d) => ({
      ...d,
      pedidos: d.pedidos.map((p) => (p.id === id ? { ...p, estado: "pendiente" as const } : p)),
    }));
  }, []);

  const registrarVentaRapida = useCallback(
    (items: ItemPedido[], cliente: string, pagado: boolean) => {
      cambiar((d) => ({
        ...d,
        productos: d.productos.map((prod) => {
          const item = items.find((i) => i.productoId === prod.id);
          return item ? { ...prod, stock: prod.stock - item.cantidad } : prod;
        }),
        pedidos: [
          {
            id: uid(),
            cliente: cliente.trim() || "Venta presencial",
            telefono: undefined,
            fecha: fechaChile(),
            items,
            estado: "entregado" as const,
            pagado,
            canal: "presencial" as const,
          },
          ...d.pedidos,
        ],
      }));
    },
    [],
  );

  const eliminarPedido = useCallback((id: string) => {
    cambiar((d) => {
      const pedido = d.pedidos.find((p) => p.id === id);
      if (!pedido) return d;

      let productos = [...d.productos];
      if (pedido.estado === "pendiente") {
        productos = productos.map((prod) => {
          const item = pedido.items.find((i) => i.productoId === prod.id);
          return item ? { ...prod, stock: prod.stock + item.cantidad } : prod;
        });
      }

      return {
        ...d,
        productos,
        pedidos: d.pedidos.filter((p) => p.id !== id),
      };
    });
  }, []);

  const agregarInsumo = useCallback((i: Omit<Insumo, "id">) => {
    cambiar((d) => ({ ...d, insumos: [...d.insumos, { ...i, id: uid() }] }));
  }, []);

  const actualizarInsumo = useCallback((id: string, i: Omit<Insumo, "id">) => {
    cambiar((d) => ({
      ...d,
      insumos: d.insumos.map((x) => (x.id === id ? { ...i, id } : x)),
    }));
  }, []);

  const eliminarInsumo = useCallback((id: string) => {
    cambiar((d) => ({
      ...d,
      insumos: d.insumos.filter((x) => x.id !== id),
      productos: d.productos.map((p) =>
        p.receta
          ? { ...p, receta: { ...p.receta, items: p.receta.items.filter((it) => it.insumoId !== id) } }
          : p,
      ),
    }));
  }, []);

  const guardarReceta = useCallback((productoId: string, receta: Receta | undefined) => {
    cambiar((d) => ({
      ...d,
      productos: d.productos.map((p) => (p.id === productoId ? { ...p, receta } : p)),
    }));
  }, []);

  const hornearLote = useCallback((productoId: string, unidades: number) => {
    const faltantes: string[] = [];
    cambiar((d) => {
      const producto = d.productos.find((p) => p.id === productoId);
      if (!producto) return d;
      const receta = producto.receta;
      let insumos = d.insumos;
      if (receta && receta.rendimiento > 0 && receta.items.length > 0) {
        const factor = unidades / receta.rendimiento;
        insumos = d.insumos.map((ins) => {
          const item = receta.items.find((it) => it.insumoId === ins.id);
          if (!item) return ins;
          const consumo = item.cantidad * factor;
          const nuevo = ins.stock - consumo;
          if (nuevo < 0) faltantes.push(ins.nombre);
          return { ...ins, stock: Math.round(nuevo * 100) / 100 };
        });
      }
      return {
        ...d,
        insumos,
        productos: d.productos.map((p) =>
          p.id === productoId ? { ...p, stock: p.stock + unidades } : p,
        ),
      };
    });
    return { faltantes };
  }, []);

  const traspasarAMillaray = useCallback((productoId: string, cantidad: number) => {
    cambiar((d) => ({
      ...d,
      productos: d.productos.map((p) =>
        p.id === productoId
          ? { ...p, stock: p.stock - cantidad, millaray: (p.millaray ?? 0) + cantidad }
          : p,
      ),
    }));
  }, []);

  const devolverDeMillaray = useCallback((productoId: string, cantidad: number) => {
    cambiar((d) => ({
      ...d,
      productos: d.productos.map((p) =>
        p.id === productoId
          ? { ...p, stock: p.stock + cantidad, millaray: Math.max(0, (p.millaray ?? 0) - cantidad) }
          : p,
      ),
    }));
  }, []);

  const venderMillaray = useCallback((productoId: string, cantidad: number) => {
    cambiar((d) => {
      const producto = d.productos.find((p) => p.id === productoId);
      if (!producto) return d;
      const pedido: Pedido = {
        id: uid(),
        cliente: "Millaray · punto de venta",
        telefono: undefined,
        fecha: fechaChile(),
        estado: "entregado",
        items: [
          {
            productoId,
            nombre: producto.nombre,
            cantidad,
            precio: producto.precio,
            costo: producto.costo,
          },
        ],
      };
      return {
        ...d,
        productos: d.productos.map((p) =>
          p.id === productoId ? { ...p, millaray: Math.max(0, (p.millaray ?? 0) - cantidad) } : p,
        ),
        pedidos: [pedido, ...d.pedidos],
      };
    });
  }, []);

  const registrarVentaMillaray = useCallback(
    (
      cliente: string,
      productoId: string,
      cantidad: number,
      metodoPago: "efectivo" | "transferencia",
      descuento?: number,
    ) => {
      cambiar((d) => {
        const producto = d.productos.find((p) => p.id === productoId);
        if (!producto || (producto.millaray ?? 0) < cantidad) return d;
        const fecha = new Date().toISOString();
        const pedido: Pedido = {
          id: uid(),
          cliente: `Millaray · ${cliente}`,
          telefono: undefined,
          fecha: fechaChile(fecha),
          estado: "entregado",
          items: [
            {
              productoId,
              nombre: producto.nombre,
              cantidad,
              precio: producto.precio,
              costo: producto.costo,
            },
          ],
          descuento,
        };
        const venta: VentaMillaray = {
          id: uid(),
          cliente,
          productoId,
          nombre: producto.nombre,
          cantidad,
          precio: producto.precio,
          metodoPago,
          pagado: false,
          fecha,
          descuento,
        };
        return {
          ...d,
          productos: d.productos.map((p) =>
            p.id === productoId ? { ...p, millaray: Math.max(0, (p.millaray ?? 0) - cantidad) } : p,
          ),
          pedidos: [pedido, ...d.pedidos],
          ventasMillaray: [venta, ...d.ventasMillaray],
        };
      });
    },
    [],
  );

  const marcarVentaMillarayPagada = useCallback((id: string) => {
    cambiar((d) => ({
      ...d,
      ventasMillaray: d.ventasMillaray.map((v) =>
        v.id === id ? { ...v, pagado: !v.pagado } : v,
      ),
    }));
  }, []);

  const eliminarVentaMillaray = useCallback((id: string) => {
    cambiar((d) => {
      const venta = d.ventasMillaray.find((v) => v.id === id);
      if (!venta) return { ...d, ventasMillaray: d.ventasMillaray.filter((v) => v.id !== id) };

      const productos = d.productos.map((p) =>
        p.id === venta.productoId
          ? { ...p, millaray: (p.millaray ?? 0) + venta.cantidad }
          : p
      );

      // El pedido que creó esta venta no tiene enlace guardado: se busca el que coincide
      // (shortcut: si hay pedidos idénticos se quita solo el primero; ya archivados en un cierre no se tocan).
      const i = d.pedidos.findIndex(
        (p) =>
          p.cliente === `Millaray · ${venta.cliente}` &&
          p.items.length === 1 &&
          p.items[0]!.productoId === venta.productoId &&
          p.items[0]!.cantidad === venta.cantidad &&
          p.descuento === venta.descuento &&
          (p.fecha === fechaChile(venta.fecha) || p.fecha === venta.fecha.slice(0, 10)),
      );

      return {
        ...d,
        productos,
        pedidos: i < 0 ? d.pedidos : d.pedidos.filter((_, j) => j !== i),
        ventasMillaray: d.ventasMillaray.filter((v) => v.id !== id),
      };
    });
  }, []);

  const traspasarAAlex = useCallback((productoId: string, cantidad: number) => {
    cambiar((d) => ({
      ...d,
      productos: d.productos.map((p) =>
        p.id === productoId && p.stock >= cantidad
          ? { ...p, stock: p.stock - cantidad, alex: (p.alex ?? 0) + cantidad }
          : p,
      ),
    }));
  }, []);

  const devolverDeAlex = useCallback((productoId: string, cantidad: number) => {
    cambiar((d) => ({
      ...d,
      productos: d.productos.map((p) =>
        p.id === productoId && (p.alex ?? 0) >= cantidad
          ? { ...p, stock: p.stock + cantidad, alex: (p.alex ?? 0) - cantidad }
          : p,
      ),
    }));
  }, []);

  // Quita la venta, devuelve las galletas a Alex y su ingreso (si el día ya se cerró, el cierre no cambia)
  const eliminarVentaAlex = useCallback((id: string) => {
    cambiar((d) => {
      const venta = d.ventasAlex.find((v) => v.id === id);
      if (!venta) return d;
      return {
        ...d,
        productos: d.productos.map((p) => {
          const n = venta.items
            .filter((i) => i.productoId === p.id)
            .reduce((s, i) => s + i.cantidad, 0);
          return n > 0 ? { ...p, alex: (p.alex ?? 0) + n } : p;
        }),
        pedidos: d.pedidos.filter((p) => p.id !== venta.pedidoId),
        ventasAlex: d.ventasAlex.filter((v) => v.id !== id),
      };
    });
  }, []);

  const pagarSueldoAlex = useCallback(() => {
    cambiar((d) => ({
      ...d,
      ventasAlex: d.ventasAlex.map((v) => (v.sueldoPagado ? v : { ...v, sueldoPagado: true })),
    }));
  }, []);

  const cerrarDia = useCallback(() => {
    let cierre: Cierre | null = null;
    cambiar((d) => {
      const entregados = d.pedidos.filter(cuentaComoVenta);
      if (entregados.length === 0) return d;
      const ingresos = entregados.reduce((s, p) => s + totalPedido(p), 0);
      const costos = entregados.reduce((s, p) => s + costoPedido(p), 0);
      const unidades = entregados.reduce(
        (s, p) => s + p.items.reduce((t, i) => t + i.cantidad, 0),
        0,
      );
      const detalleMap = new Map<string, ItemPedido>();
      entregados.forEach((p) =>
        p.items.forEach((i) => {
          const prev = detalleMap.get(i.productoId);
          if (prev) {
            prev.cantidad += i.cantidad;
          } else {
            detalleMap.set(i.productoId, { ...i });
          }
        }),
      );
      const nuevo: Cierre = {
        id: uid(),
        fecha: new Date().toISOString(),
        ingresos,
        costos,
        utilidad: ingresos - costos,
        pedidos: entregados.length,
        unidades,
        detalle: [...detalleMap.values()],
      };
      cierre = nuevo;
      return {
        ...d,
        pedidos: d.pedidos.filter((p) => !cuentaComoVenta(p)),
        cierres: [...d.cierres, nuevo],
      };
    });
    return cierre;
  }, []);

  const actualizarCierre = useCallback((id: string, c: Omit<Cierre, "id">) => {
    cambiar((d) => ({
      ...d,
      cierres: d.cierres.map((x) => (x.id === id ? { ...x, ...c, id } : x)),
    }));
  }, []);

  const eliminarCierre = useCallback((id: string) => {
    cambiar((d) => ({ ...d, cierres: d.cierres.filter((x) => x.id !== id) }));
  }, []);

  const value = useMemo(
    () => ({
      productos: data.productos,
      pedidos: data.pedidos,
      cierres: data.cierres,
      insumos: data.insumos,
      ventasMillaray: data.ventasMillaray,
      ventasAlex: data.ventasAlex,
      hidratado,
      estadoSync,
      sesion,
      sesionAlex,
      iniciarSesion,
      iniciarSesionAlex,
      cerrarSesion,
      agregarProducto,
      actualizarProducto,
      eliminarProducto,
      agregarPedido,
      actualizarPedido,
      entregarPedido,
      marcarPedidoPagado,
      deshacerEntrega,
      registrarVentaRapida,
      eliminarPedido,
      cerrarDia,
      actualizarCierre,
      eliminarCierre,
      agregarInsumo,
      actualizarInsumo,
      eliminarInsumo,
      guardarReceta,
      hornearLote,
      traspasarAMillaray,
      devolverDeMillaray,
      venderMillaray,
      registrarVentaMillaray,
      marcarVentaMillarayPagada,
      eliminarVentaMillaray,
      traspasarAAlex,
      devolverDeAlex,
      eliminarVentaAlex,
      pagarSueldoAlex,
    }),
    [
      data,
      hidratado,
      estadoSync,
      sesion,
      sesionAlex,
      iniciarSesion,
      iniciarSesionAlex,
      cerrarSesion,
      agregarProducto,
      actualizarProducto,
      eliminarProducto,
      agregarPedido,
      actualizarPedido,
      entregarPedido,
      marcarPedidoPagado,
      deshacerEntrega,
      registrarVentaRapida,
      eliminarPedido,
      cerrarDia,
      actualizarCierre,
      eliminarCierre,
      agregarInsumo,
      actualizarInsumo,
      eliminarInsumo,
      guardarReceta,
      hornearLote,
      traspasarAMillaray,
      devolverDeMillaray,
      venderMillaray,
      registrarVentaMillaray,
      marcarVentaMillarayPagada,
      eliminarVentaMillaray,
      traspasarAAlex,
      devolverDeAlex,
      eliminarVentaAlex,
      pagarSueldoAlex,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

export const money = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? n : 0);

/** Venta real: entregada y no marcada como impaga (pagado undefined = pedido antiguo, cuenta). */
export const cuentaComoVenta = (p: Pedido) => p.estado === "entregado" && p.pagado !== false;

/** Falta entregar o cobrar. */
export const esPendiente = (p: Pedido) => p.estado === "pendiente" || p.pagado === false;

export const totalPedido = (p: Pedido) => {
  const subtotal = p.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const desc = p.descuento && p.descuento > 0 ? (subtotal * p.descuento) / 100 : 0;
  return Math.max(0, subtotal - desc);
};

export const costoPedido = (p: Pedido) =>
  p.items.reduce((s, i) => s + i.costo * i.cantidad, 0);
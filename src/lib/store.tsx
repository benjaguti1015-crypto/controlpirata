import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export type Producto = {
  id: string;
  nombre: string;
  costo: number;
  precio: number;
  stock: number;
  millaray?: number | undefined;
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

type Data = {
  productos: Producto[];
  pedidos: Pedido[];
  cierres: Cierre[];
  insumos: Insumo[];
  ventasMillaray: VentaMillaray[];
};

const KEY = "dulces-rey-pirata-v1";
const STATE_ID = "main";

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
    (p.estado === "pendiente" || p.estado === "entregado")
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
    typeof x.fecha === "string"
  );
};

const vacio: Data = { productos: [], pedidos: [], cierres: [], insumos: [], ventasMillaray: [] };

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
  hidratado: boolean;
  agregarProducto: (p: Omit<Producto, "id">) => void;
  actualizarProducto: (id: string, p: Omit<Producto, "id">) => void;
  eliminarProducto: (id: string) => void;
  agregarPedido: (
    cliente: string,
    telefono: string,
    fecha: string,
    items: ItemPedido[],
  ) => void;
  actualizarPedido: (
    id: string,
    cliente: string,
    telefono: string,
    fecha: string,
    items: ItemPedido[],
  ) => void;
  entregarPedido: (id: string) => void;
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
  ) => void;
  marcarVentaMillarayPagada: (id: string) => void;
  eliminarVentaMillaray: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(vacio);
  const [hidratado, setHidratado] = useState(false);
  const remoto = useRef(false);
  const ultimaEscritura = useRef<string>("");

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { data: row } = await supabase
          .from("app_state")
          .select("data, updated_at")
          .eq("id", STATE_ID)
          .maybeSingle();
        if (cancelado) return;
        if (row?.updated_at) ultimaEscritura.current = row.updated_at;
        const nube = sanea(row?.data);
        if (tieneDatos(nube)) {
          setData(nube);
        } else {
          const local = loadLocal();
          if (tieneDatos(local)) {
            setData(local);
            await supabase
              .from("app_state")
              .upsert({ id: STATE_ID, data: local, updated_at: new Date().toISOString() });
          }
        }
      } catch {
        const local = loadLocal();
        if (!cancelado && tieneDatos(local)) setData(local);
      } finally {
        if (!cancelado) setHidratado(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("app_state_sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_state" },
        (payload) => {
          const nuevo = payload.new as { data?: unknown; updated_at?: string };
          const ts = nuevo?.updated_at ?? "";
          if (ts && ultimaEscritura.current && ts <= ultimaEscritura.current) return;
          if (ts) ultimaEscritura.current = ts;
          const incoming = sanea(nuevo?.data);
          remoto.current = true;
          setData(incoming);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* almacenamiento no disponible */
    }
    if (remoto.current) {
      remoto.current = false;
      return;
    }
    const ts = new Date().toISOString();
    ultimaEscritura.current = ts;
    void supabase
      .from("app_state")
      .upsert({ id: STATE_ID, data, updated_at: ts })
      .then(() => undefined);
  }, [data, hidratado]);

  const agregarProducto = useCallback((p: Omit<Producto, "id">) => {
    setData((d) => ({ ...d, productos: [...d.productos, { ...p, id: uid() }] }));
  }, []);

  const actualizarProducto = useCallback((id: string, p: Omit<Producto, "id">) => {
    setData((d) => ({
      ...d,
      productos: d.productos.map((x) => (x.id === id ? { ...x, ...p, id } : x)),
    }));
  }, []);

  const eliminarProducto = useCallback((id: string) => {
    setData((d) => ({ ...d, productos: d.productos.filter((x) => x.id !== id) }));
  }, []);

  const agregarPedido = useCallback(
    (cliente: string, telefono: string, fecha: string, items: ItemPedido[]) => {
      setData((d) => ({
        ...d,
        pedidos: [
          { id: uid(), cliente, telefono: telefono.trim() || undefined, fecha, items, estado: "pendiente" },
          ...d.pedidos,
        ],
      }));
    },
    [],
  );

  const actualizarPedido = useCallback(
    (id: string, cliente: string, telefono: string, fecha: string, items: ItemPedido[]) => {
      setData((d) => ({
        ...d,
        pedidos: d.pedidos.map((p) =>
          p.id === id
            ? {
                ...p,
                cliente: cliente.trim(),
                telefono: telefono.trim() || undefined,
                fecha,
                items,
              }
            : p,
        ),
      }));
    },
    [],
  );

  const entregarPedido = useCallback((id: string) => {
    setData((d) => {
      const pedido = d.pedidos.find((p) => p.id === id);
      if (!pedido || pedido.estado === "entregado") return d;
      const productos = d.productos.map((prod) => {
        const item = pedido.items.find((i) => i.productoId === prod.id);
        return item ? { ...prod, stock: prod.stock - item.cantidad } : prod;
      });
      return {
        ...d,
        productos,
        pedidos: d.pedidos.map((p) => (p.id === id ? { ...p, estado: "entregado" as const } : p)),
      };
    });
  }, []);

  const eliminarPedido = useCallback((id: string) => {
    setData((d) => ({ ...d, pedidos: d.pedidos.filter((p) => p.id !== id) }));
  }, []);

  const agregarInsumo = useCallback((i: Omit<Insumo, "id">) => {
    setData((d) => ({ ...d, insumos: [...d.insumos, { ...i, id: uid() }] }));
  }, []);

  const actualizarInsumo = useCallback((id: string, i: Omit<Insumo, "id">) => {
    setData((d) => ({
      ...d,
      insumos: d.insumos.map((x) => (x.id === id ? { ...i, id } : x)),
    }));
  }, []);

  const eliminarInsumo = useCallback((id: string) => {
    setData((d) => ({
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
    setData((d) => ({
      ...d,
      productos: d.productos.map((p) => (p.id === productoId ? { ...p, receta } : p)),
    }));
  }, []);

  const hornearLote = useCallback((productoId: string, unidades: number) => {
    const faltantes: string[] = [];
    setData((d) => {
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
    setData((d) => ({
      ...d,
      productos: d.productos.map((p) =>
        p.id === productoId
          ? { ...p, stock: p.stock - cantidad, millaray: (p.millaray ?? 0) + cantidad }
          : p,
      ),
    }));
  }, []);

  const devolverDeMillaray = useCallback((productoId: string, cantidad: number) => {
    setData((d) => ({
      ...d,
      productos: d.productos.map((p) =>
        p.id === productoId
          ? { ...p, stock: p.stock + cantidad, millaray: Math.max(0, (p.millaray ?? 0) - cantidad) }
          : p,
      ),
    }));
  }, []);

  const venderMillaray = useCallback((productoId: string, cantidad: number) => {
    setData((d) => {
      const producto = d.productos.find((p) => p.id === productoId);
      if (!producto) return d;
      const pedido: Pedido = {
        id: uid(),
        cliente: "Millaray · punto de venta",
        telefono: undefined,
        fecha: new Date().toISOString().slice(0, 10),
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
    ) => {
      setData((d) => {
        const producto = d.productos.find((p) => p.id === productoId);
        if (!producto || (producto.millaray ?? 0) < cantidad) return d;
        const fecha = new Date().toISOString();
        const pedido: Pedido = {
          id: uid(),
          cliente: `Millaray · ${cliente}`,
          telefono: undefined,
          fecha: fecha.slice(0, 10),
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
    setData((d) => ({
      ...d,
      ventasMillaray: d.ventasMillaray.map((v) =>
        v.id === id ? { ...v, pagado: !v.pagado } : v,
      ),
    }));
  }, []);

  const eliminarVentaMillaray = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      ventasMillaray: d.ventasMillaray.filter((v) => v.id !== id),
    }));
  }, []);

  const cerrarDia = useCallback(() => {
    let cierre: Cierre | null = null;
    setData((d) => {
      const entregados = d.pedidos.filter((p) => p.estado === "entregado");
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
      cierre = {
        id: uid(),
        fecha: new Date().toISOString(),
        ingresos,
        costos,
        utilidad: ingresos - costos,
        pedidos: entregados.length,
        unidades,
        detalle: [...detalleMap.values()],
      };
      return {
        ...d,
        pedidos: d.pedidos.filter((p) => p.estado !== "entregado"),
        cierres: [...d.cierres, cierre],
      };
    });
    return cierre;
  }, []);

  const actualizarCierre = useCallback((id: string, c: Omit<Cierre, "id">) => {
    setData((d) => ({
      ...d,
      cierres: d.cierres.map((x) => (x.id === id ? { ...x, ...c, id } : x)),
    }));
  }, []);

  const eliminarCierre = useCallback((id: string) => {
    setData((d) => ({ ...d, cierres: d.cierres.filter((x) => x.id !== id) }));
  }, []);

  const value = useMemo(
    () => ({
      productos: data.productos,
      pedidos: data.pedidos,
      cierres: data.cierres,
      insumos: data.insumos,
      ventasMillaray: data.ventasMillaray,
      hidratado,
      agregarProducto,
      actualizarProducto,
      eliminarProducto,
      agregarPedido,
      actualizarPedido,
      entregarPedido,
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
    }),
    [
      data,
      hidratado,
      agregarProducto,
      actualizarProducto,
      eliminarProducto,
      agregarPedido,
      actualizarPedido,
      entregarPedido,
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

export const totalPedido = (p: Pedido) =>
  p.items.reduce((s, i) => s + i.precio * i.cantidad, 0);

export const costoPedido = (p: Pedido) =>
  p.items.reduce((s, i) => s + i.costo * i.cantidad, 0);
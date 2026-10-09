import { fechaChile } from "@/lib/fecha";
import { cuentaComoVenta, type Cierre, type Pedido, type Producto } from "@/lib/store";

export type Dia = { fecha: string; ventas: number; utilidad: number };

/** Últimos n días (YYYY-MM-DD, America/Santiago), el último es hoy. */
const ultimosDias = (n: number) => {
  const base = new Date(`${fechaChile()}T12:00:00Z`).getTime();
  return Array.from({ length: n }, (_, i) =>
    new Date(base - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
};

/** Ventas y utilidad por día: días cerrados (cierres) + pedidos aún abiertos. */
export function ventasPorDia(cierres: Cierre[], pedidos: Pedido[], n = 30): Dia[] {
  const mapa = new Map<string, Dia>(ultimosDias(n).map((f) => [f, { fecha: f, ventas: 0, utilidad: 0 }]));
  for (const c of cierres) {
    const d = mapa.get(fechaChile(c.fecha));
    if (d) {
      d.ventas += c.ingresos;
      d.utilidad += c.utilidad;
    }
  }
  for (const p of pedidos.filter(cuentaComoVenta)) {
    const d = mapa.get(p.fecha);
    if (!d) continue;
    const ingreso = p.items.reduce((s, i) => s + i.precio * i.cantidad, 0) * (1 - (p.descuento ?? 0) / 100);
    d.ventas += ingreso;
    d.utilidad += ingreso - p.items.reduce((s, i) => s + i.costo * i.cantidad, 0);
  }
  return [...mapa.values()];
}

/** Unidades e ingreso (sin descuentos) por producto en el rango de días dado. */
export function ventasPorProducto(cierres: Cierre[], pedidos: Pedido[], dias: Dia[], productos: Producto[]) {
  const rango = new Set(dias.map((d) => d.fecha));
  // Agrupa por nombre sin mayúsculas ("Botín de Nutella" = "Botín de nutella") y muestra el nombre actual del producto.
  const clave = (n: string) => n.trim().toLowerCase();
  const actual = new Map(productos.map((p) => [clave(p.nombre), p.nombre]));
  const mapa = new Map<string, { nombre: string; unidades: number; ingresos: number }>();
  const sumar = (items: { productoId: string; nombre: string; cantidad: number; precio: number }[]) =>
    items.forEach((i) => {
      const k = clave(i.nombre);
      const prev = mapa.get(k) ?? { nombre: actual.get(k) ?? i.nombre, unidades: 0, ingresos: 0 };
      mapa.set(k, {
        nombre: prev.nombre,
        unidades: prev.unidades + i.cantidad,
        ingresos: prev.ingresos + i.precio * i.cantidad,
      });
    });
  cierres.filter((c) => rango.has(fechaChile(c.fecha))).forEach((c) => sumar(c.detalle ?? []));
  pedidos.filter((p) => cuentaComoVenta(p) && rango.has(p.fecha)).forEach((p) => sumar(p.items));
  return [...mapa.values()].sort((a, b) => b.unidades - a.unidades);
}

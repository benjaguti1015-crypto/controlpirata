// Promos: precio fijo por el pedido completo. Clásico no entra en promos.

export type PromoId = "duo" | "tripulacion" | "cofre";

export type Promo = {
  id: PromoId;
  nombre: string;
  galletas: number;
  precio: number;
  caja: boolean;
};

export const PROMOS: Promo[] = [
  { id: "duo", nombre: "Dúo Pirata", galletas: 2, precio: 3500, caja: false },
  { id: "tripulacion", nombre: "La Tripulación", galletas: 4, precio: 6500, caja: true },
  { id: "cofre", nombre: "Cofre del Rey", galletas: 6, precio: 9500, caja: true },
];

export const entraEnPromo = (nombre: string) => !/cl[aá]sic/i.test(nombre);

/**
 * Reparte el precio de la promo entre las galletas en pesos enteros: la suma da exacto el precio.
 * Una misma galleta puede quedar en dos líneas (ej. 2 × $1.584 y 1 × $1.583).
 */
export function repartirPromo<T extends { productoId: string; cantidad: number }>(
  precio: number,
  sabores: T[],
): (T & { precio: number })[] {
  const total = sabores.reduce((s, x) => s + x.cantidad, 0);
  if (total <= 0) return [];
  const base = Math.floor(precio / total);
  let resto = precio - base * total; // las primeras `resto` galletas llevan $1 más
  const lineas: (T & { precio: number })[] = [];
  for (const s of sabores) {
    if (s.cantidad <= 0) continue;
    const extra = Math.min(resto, s.cantidad);
    resto -= extra;
    if (extra > 0) lineas.push({ ...s, cantidad: extra, precio: base + 1 });
    if (s.cantidad - extra > 0) lineas.push({ ...s, cantidad: s.cantidad - extra, precio: base });
  }
  return lineas;
}

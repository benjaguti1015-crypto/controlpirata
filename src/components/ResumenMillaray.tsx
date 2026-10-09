import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fechaChile } from "@/lib/fecha";
import { money, useStore, type VentaMillaray } from "@/lib/store";

const totalVenta = (v: VentaMillaray) =>
  Math.max(0, v.precio * v.cantidad * (1 - (v.descuento ?? 0) / 100));

/** Agrupa por clienta sin distinguir mayúsculas ("rosa" = "Rosa"). */
function porClienta(ventas: VentaMillaray[]) {
  const mapa = new Map<string, { nombre: string; ventas: VentaMillaray[]; total: number; porCobrar: number }>();
  for (const v of ventas) {
    const k = v.cliente.trim().toLowerCase();
    const g = mapa.get(k) ?? { nombre: v.cliente.trim(), ventas: [], total: 0, porCobrar: 0 };
    g.ventas.push(v);
    g.total += totalVenta(v);
    if (!v.pagado) g.porCobrar += totalVenta(v);
    mapa.set(k, g);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

/** Une las líneas del mismo producto: "3× Nube dulce, 1× Botín de oreo". */
function detalle(ventas: VentaMillaray[]) {
  const m = new Map<string, number>();
  ventas.forEach((v) => m.set(v.nombre, (m.get(v.nombre) ?? 0) + v.cantidad));
  return [...m].map(([n, c]) => `${c}× ${n}`).join(", ");
}

const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 0, label: "Todo" },
] as const;

export function ResumenMillaray() {
  const { ventasMillaray } = useStore();
  const [dias, setDias] = useState<number>(7);

  const hoy = fechaChile();
  const delDia = porClienta(ventasMillaray.filter((v) => fechaChile(v.fecha) === hoy));
  const totalDia = delDia.reduce((s, g) => s + g.total, 0);
  const porCobrarDia = delDia.reduce((s, g) => s + g.porCobrar, 0);

  const desde = dias === 0 ? "" : fechaChile(new Date(Date.now() - (dias - 1) * 86_400_000));
  const delPeriodo = porClienta(ventasMillaray.filter((v) => fechaChile(v.fecha) >= desde));

  const copiar = async () => {
    const texto = [
      `Resumen Millaray ${hoy.slice(8)}/${hoy.slice(5, 7)}`,
      ...delDia.map((g) => `${g.nombre}: ${detalle(g.ventas)} = ${money(g.total)}`),
      `Total del día: ${money(totalDia)}${porCobrarDia > 0 ? ` (por cobrar ${money(porCobrarDia)})` : ""}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Resumen copiado");
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto a mano.");
    }
  };

  return (
    <section className="mt-7 space-y-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Resumen del día</h2>
            <Button variant="outline" className="h-11 gap-2" onClick={copiar} disabled={delDia.length === 0}>
              <Copy className="h-4 w-4" /> Copiar
            </Button>
          </div>
          {delDia.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Aún no hay ventas hoy.</p>
          ) : (
            <>
              <ul className="mt-3 divide-y">
                {delDia.map((g) => (
                  <li key={g.nombre} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{g.nombre}</p>
                      <p className="text-xs text-muted-foreground">{detalle(g.ventas)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums">{money(g.total)}</p>
                      {g.porCobrar > 0 && (
                        <p className="text-xs text-muted-foreground">falta {money(g.porCobrar)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t pt-3 font-semibold">
                <span>Total del día</span>
                <span className="tabular-nums">{money(totalDia)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold">Total por clienta</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                type="button"
                onClick={() => setDias(p.dias)}
                className={`min-h-11 rounded-xl border text-sm font-semibold transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] ${
                  dias === p.dias ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {delPeriodo.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No hay ventas en este período.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {delPeriodo.map((g) => (
                <li key={g.nombre} className="flex items-start justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate font-semibold">{g.nombre}</span>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums">{money(g.total)}</p>
                    {g.porCobrar > 0 && (
                      <p className="text-xs text-muted-foreground">falta {money(g.porCobrar)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

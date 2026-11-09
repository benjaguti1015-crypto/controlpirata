import { useState } from "react";
import { Minus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PROMOS_RAPIDAS, entraEnPromo, repartirPromo, type PromoId } from "@/lib/promos";
import { money, useStore, type ItemPedido } from "@/lib/store";

export function VentaPromo() {
  const { productos, registrarVentaRapida, costosCaja, fijarCostoCaja } = useStore();
  const [promoId, setPromoId] = useState<PromoId>("duo");
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [cliente, setCliente] = useState("");
  const [pagado, setPagado] = useState(true);

  // Las promos con caja (4 y 6) se encargan con anticipación: van en Pedidos
  const promo = PROMOS_RAPIDAS.find((p) => p.id === promoId) ?? PROMOS_RAPIDAS[0]!;
  const sabores = productos.filter((p) => entraEnPromo(p.nombre));
  const elegidas = sabores.reduce((s, p) => s + (cantidades[p.id] ?? 0), 0);
  const diferencia = promo.galletas - elegidas;
  const costoCaja = promo.caja ? costosCaja[promo.id] : undefined;
  const faltaCostoCaja = promo.caja && costoCaja === undefined;

  const cambiar = (id: string, delta: number, stock: number) =>
    setCantidades((c) => ({ ...c, [id]: Math.max(0, Math.min(stock, (c[id] ?? 0) + delta)) }));

  const registrar = () => {
    if (diferencia !== 0) return;
    const items: ItemPedido[] = repartirPromo(
      promo.precio,
      sabores
        .filter((p) => (cantidades[p.id] ?? 0) > 0)
        .map((p) => ({
          productoId: p.id,
          nombre: p.nombre,
          cantidad: cantidades[p.id]!,
          costo: p.costo,
        })),
    );
    registrarVentaRapida(items, cliente, pagado, {
      id: promo.id,
      nombre: promo.nombre,
      precio: promo.precio,
      costoCaja,
    });
    toast.success(
      pagado ? `${promo.nombre} registrada` : `${promo.nombre} registrada, falta cobrar`,
      {
        description: `${money(promo.precio)}${cliente.trim() ? ` · ${cliente.trim()}` : ""}`,
      },
    );
    setCantidades({});
    setCliente("");
    setPagado(true);
  };

  if (sabores.length === 0 || PROMOS_RAPIDAS.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-base font-semibold">Venta por promo</h2>
        {PROMOS_RAPIDAS.length === 1 && (
          <p className="text-xs text-muted-foreground">
            {promo.nombre} · {promo.galletas} u. · {money(promo.precio)}
          </p>
        )}

        {PROMOS_RAPIDAS.length > 1 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {PROMOS_RAPIDAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPromoId(p.id)}
                className={`flex min-h-14 touch-manipulation flex-col items-center justify-center rounded-xl border px-1 text-center transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] ${
                  promoId === p.id ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                <span className="text-xs font-semibold leading-tight">{p.nombre}</span>
                <span className="text-[11px] tabular-nums opacity-80">
                  {p.galletas} u. · {money(p.precio)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {sabores.map((p) => {
            const n = cantidades[p.id] ?? 0;
            const agotado = p.stock <= 0;
            return (
              <div key={p.id} className="relative">
                <button
                  type="button"
                  disabled={agotado || n >= p.stock || diferencia <= 0}
                  onClick={() => cambiar(p.id, 1, p.stock)}
                  className={`flex min-h-[4.5rem] w-full touch-manipulation flex-col items-start justify-between rounded-2xl border p-3 text-left transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 ${
                    n > 0 ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  <span className="line-clamp-2 text-sm font-semibold leading-tight">
                    {p.nombre}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {agotado ? "agotado" : `${p.stock} u.`}
                  </span>
                </button>
                {n > 0 && (
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Quitar ${p.nombre}`}
                      onClick={() => cambiar(p.id, -1, p.stock)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-background shadow-sm transition-transform duration-150 ease-out active:scale-[0.92]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="grid h-8 min-w-8 place-items-center rounded-full bg-primary px-2 text-sm font-semibold tabular-nums text-primary-foreground">
                      {n}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p
          className={`mt-3 text-sm font-medium ${diferencia === 0 ? "text-primary" : "text-muted-foreground"}`}
          aria-live="polite"
        >
          {diferencia > 0
            ? `Faltan ${diferencia} galleta${diferencia === 1 ? "" : "s"} (${elegidas} de ${promo.galletas})`
            : diferencia < 0
              ? `Sobran ${-diferencia} galleta${diferencia === -1 ? "" : "s"} (${elegidas} de ${promo.galletas})`
              : `Listo: ${promo.galletas} galletas`}
        </p>

        {promo.caja && (
          <label className="mt-3 block text-sm">
            <span className="font-medium">Costo de la caja ({promo.nombre})</span>
            <Input
              className="mt-1 h-12 text-base"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Sin definir"
              value={costoCaja ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                const n = Number(v);
                fijarCostoCaja(promo.id, v === "" || !Number.isFinite(n) || n < 0 ? undefined : n);
              }}
            />
            {faltaCostoCaja && (
              <span className="mt-1 block text-xs text-destructive">
                Falta el costo de la caja: la utilidad de esta promo no lo incluye.
              </span>
            )}
          </label>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(
            [
              [true, "Pagado"],
              [false, "Falta cobrar"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setPagado(v)}
              className={`min-h-12 touch-manipulation rounded-xl border text-sm font-semibold transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] ${
                pagado === v ? "border-primary bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Input
          className="mt-3 h-12 text-base"
          placeholder="Cliente (opcional)"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
        />

        <Button
          className="mt-3 h-14 w-full text-base transition-transform duration-150 ease-out active:scale-[0.98]"
          disabled={diferencia !== 0}
          onClick={registrar}
        >
          {diferencia === 0
            ? `Registrar ${promo.nombre} · ${money(promo.precio)}`
            : "Elige los sabores"}
        </Button>
      </CardContent>
    </Card>
  );
}

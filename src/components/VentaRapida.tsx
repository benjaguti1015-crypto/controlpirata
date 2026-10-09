import { useState } from "react";
import { Minus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { money, useStore, type ItemPedido } from "@/lib/store";

export function VentaRapida() {
  const { productos, registrarVentaRapida } = useStore();
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [cliente, setCliente] = useState("");
  const [pagado, setPagado] = useState(true);

  const items: ItemPedido[] = productos
    .filter((p) => (cantidades[p.id] ?? 0) > 0)
    .map((p) => ({
      productoId: p.id,
      nombre: p.nombre,
      cantidad: cantidades[p.id]!,
      precio: p.precio,
      costo: p.costo,
    }));
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const cambiar = (id: string, delta: number, stock: number) =>
    setCantidades((c) => ({ ...c, [id]: Math.max(0, Math.min(stock, (c[id] ?? 0) + delta)) }));

  const registrar = () => {
    registrarVentaRapida(items, cliente, pagado);
    toast.success(pagado ? "Venta registrada" : "Venta registrada, falta cobrar", {
      description: `${money(total)}${cliente.trim() ? ` · ${cliente.trim()}` : ""}`,
    });
    setCantidades({});
    setCliente("");
    setPagado(true);
  };

  if (productos.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-base font-semibold">Venta rápida</h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {productos.map((p) => {
            const n = cantidades[p.id] ?? 0;
            const agotado = p.stock <= 0;
            return (
              <div key={p.id} className="relative">
                <button
                  type="button"
                  disabled={agotado || n >= p.stock}
                  onClick={() => cambiar(p.id, 1, p.stock)}
                  className={`flex min-h-[4.5rem] w-full touch-manipulation flex-col items-start justify-between rounded-2xl border p-3 text-left transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 ${
                    n > 0 ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  <span className="line-clamp-2 text-sm font-semibold leading-tight">{p.nombre}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {money(p.precio)} · {agotado ? "agotado" : `${p.stock} u.`}
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
          disabled={items.length === 0}
          onClick={registrar}
        >
          {items.length === 0 ? "Toca una galleta para empezar" : `Registrar · ${money(total)}`}
        </Button>
      </CardContent>
    </Card>
  );
}

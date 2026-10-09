import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { esPendiente, money, totalPedido, useStore } from "@/lib/store";

export function Pendientes() {
  const { pedidos, entregarPedido, marcarPedidoPagado, deshacerEntrega } = useStore();
  const lista = pedidos.filter(esPendiente);

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-base font-semibold">
          Pendientes{lista.length > 0 ? ` (${lista.length})` : ""}
        </h2>
        {lista.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Todo entregado y cobrado.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {lista.map((p) => (
              <li key={p.id} className="rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.cliente}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {money(totalPedido(p))}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  {p.estado === "pendiente" && (
                    <Button
                      className="h-12 flex-1 transition-transform duration-150 ease-out active:scale-[0.97]"
                      onClick={() => {
                        entregarPedido(p.id);
                        toast.success("Marcado como entregado", {
                          duration: 8000,
                          action: { label: "Deshacer", onClick: () => deshacerEntrega(p.id) },
                        });
                      }}
                    >
                      Entregado
                    </Button>
                  )}
                  {p.estado === "entregado" && (
                    <Button
                      variant="ghost"
                      className="h-12 transition-transform duration-150 ease-out active:scale-[0.97]"
                      onClick={() => deshacerEntrega(p.id)}
                    >
                      No se entregó
                    </Button>
                  )}
                  {p.pagado === false && (
                    <Button
                      variant="outline"
                      className="h-12 flex-1 transition-transform duration-150 ease-out active:scale-[0.97]"
                      onClick={() => {
                        marcarPedidoPagado(p.id);
                        toast.success("Marcado como pagado", {
                          duration: 8000,
                          action: { label: "Deshacer", onClick: () => marcarPedidoPagado(p.id, false) },
                        });
                      }}
                    >
                      Ya pagó
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  HandCoins,
  PackageCheck,
  Trash2,
  Undo2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { AdminGuard } from "@/components/adminguard";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SUELDO_POR_GALLETA,
  money,
  totalVentaAlex,
  unidadesVentaAlex,
  useStore,
  type Producto,
} from "@/lib/store";

export const Route = createFileRoute("/chico-alex")({
  head: () => ({
    meta: [{ title: "Chico Alex · punto de venta | Dulces del Rey Pirata" }],
  }),
  component: ChicoAlexPage,
});

type Accion = "traspaso" | "devolucion";

function ChicoAlexPage() {
  return (
    <AdminGuard>
      <ChicoAlexContenido />
    </AdminGuard>
  );
}

function ChicoAlexContenido() {
  const {
    productos,
    ventasAlex,
    traspasarAAlex,
    devolverDeAlex,
    eliminarVentaAlex,
    pagarSueldoAlex,
  } = useStore();

  const [accion, setAccion] = useState<Accion | null>(null);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState("");
  const [confirmarPago, setConfirmarPago] = useState(false);

  const sinLiquidar = useMemo(() => ventasAlex.filter((v) => !v.sueldoPagado), [ventasAlex]);

  const resumen = useMemo(() => {
    const enPoder = productos.reduce((s, p) => s + (p.alex ?? 0), 0);
    const vendidas = sinLiquidar.reduce((s, v) => s + unidadesVentaAlex(v), 0);
    const efectivo = sinLiquidar
      .filter((v) => v.metodoPago === "efectivo")
      .reduce((s, v) => s + totalVentaAlex(v), 0);
    const transferencia = sinLiquidar
      .filter((v) => v.metodoPago === "transferencia")
      .reduce((s, v) => s + totalVentaAlex(v), 0);
    return { enPoder, vendidas, sueldo: vendidas * SUELDO_POR_GALLETA, efectivo, transferencia };
  }, [productos, sinLiquidar]);

  const disponible =
    producto === null ? 0 : accion === "traspaso" ? producto.stock : (producto.alex ?? 0);

  const abrir = (a: Accion, p: Producto) => {
    setAccion(a);
    setProducto(p);
    setCantidad("");
    setError("");
  };

  const cerrar = () => {
    setAccion(null);
    setProducto(null);
  };

  const confirmar = () => {
    if (!producto || !accion) return;
    const n = Number(cantidad);
    if (cantidad === "" || !Number.isInteger(n) || n <= 0) {
      setError("Ingresa una cantidad entera mayor que 0");
      return;
    }
    if (n > disponible) {
      setError(`Solo hay ${disponible} unidades disponibles`);
      return;
    }
    if (accion === "traspaso") {
      traspasarAAlex(producto.id, n);
      toast.success(`${n} u. de ${producto.nombre} traspasadas a Alex`);
    } else {
      devolverDeAlex(producto.id, n);
      toast.success(`${n} u. devueltas al stock principal`);
    }
    cerrar();
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">CHICO ALEX</h1>
          <p className="text-sm text-muted-foreground">
            Su panel de ventas está en <span className="font-medium">/alex</span>
          </p>
        </div>
        <Button onClick={() => setConfirmarPago(true)} disabled={resumen.vendidas === 0}>
          <HandCoins className="h-4 w-4" /> Pagar sueldo
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              <PackageCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Galletas en poder de Alex
              </p>
              <p className="text-lg font-semibold">{resumen.enPoder} u.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <HandCoins className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Sueldo por pagar
              </p>
              <p className="text-lg font-semibold">{money(resumen.sueldo)}</p>
              <p className="text-xs text-muted-foreground">
                {resumen.vendidas} galletas × {money(SUELDO_POR_GALLETA)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <Banknote className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Vendido desde el último pago
              </p>
              <p className="text-lg font-semibold">
                {money(resumen.efectivo + resumen.transferencia)}
              </p>
              <p className="text-xs text-muted-foreground">
                Efectivo {money(resumen.efectivo)} · Transf. {money(resumen.transferencia)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="mt-7">
        <h2 className="text-lg font-semibold">Ventas desde el último pago</h2>
        <div className="mt-3 space-y-2">
          {sinLiquidar.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Alex no tiene ventas pendientes.</p>
              </CardContent>
            </Card>
          ) : (
            sinLiquidar.map((v) => (
              <Card key={v.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.cliente || "Venta"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.fecha).toLocaleString("es-CL", {
                        timeZone: "America/Santiago",
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {v.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")}
                    </p>
                    <Badge
                      className="mt-1.5"
                      variant={v.metodoPago === "efectivo" ? "secondary" : "outline"}
                    >
                      {v.metodoPago === "efectivo" ? (
                        <Banknote className="h-3 w-3" />
                      ) : (
                        <CreditCard className="h-3 w-3" />
                      )}
                      {v.metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}
                    </Badge>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{money(totalVentaAlex(v))}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground"
                    onClick={() => {
                      eliminarVentaAlex(v.id);
                      toast.success("Venta eliminada y galletas devueltas a Alex");
                    }}
                    aria-label="Eliminar venta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-lg font-semibold">Stock asignado</h2>
        <div className="mt-3 space-y-3">
          {productos.length === 0 ? (
            <EmptyState
              icon={UserRound}
              title="Aún no hay galletas registradas"
              description="Registra productos en el inventario para poder traspasar unidades a Alex."
            />
          ) : (
            productos.map((p) => {
              const enAlex = p.alex ?? 0;
              return (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{p.nombre}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Stock principal: {p.stock} u. · {money(p.precio)} c/u
                        </p>
                      </div>
                      <Badge
                        variant={enAlex > 0 ? "default" : "secondary"}
                        className="shrink-0 whitespace-nowrap"
                      >
                        Alex: {enAlex} u.
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={p.stock <= 0}
                        onClick={() => abrir("traspaso", p)}
                      >
                        <ArrowLeftRight className="h-4 w-4" /> Traspasar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={enAlex <= 0}
                        onClick={() => abrir("devolucion", p)}
                      >
                        <Undo2 className="h-4 w-4" /> Devolver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </section>

      <Dialog open={accion !== null} onOpenChange={(o) => (o ? null : cerrar())}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {accion === "traspaso" ? "Traspasar a Alex" : "Devolver al stock principal"}
            </DialogTitle>
            <DialogDescription>
              {producto?.nombre} · disponibles: {disponible} u.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="alex-cantidad">Cantidad</Label>
            <Input
              id="alex-cantidad"
              type="number"
              min={1}
              step={1}
              value={cantidad}
              onChange={(e) => {
                setCantidad(e.target.value);
                setError("");
              }}
              placeholder="Ej: 10"
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <Button onClick={confirmar}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarPago} onOpenChange={setConfirmarPago}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Pagar {money(resumen.sueldo)} a Alex?</AlertDialogTitle>
            <AlertDialogDescription>
              Son {resumen.vendidas} galletas vendidas. Su sueldo pendiente vuelve a cero y estas
              ventas ya no se podrán deshacer desde su panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pagarSueldoAlex(sinLiquidar.map((v) => v.id));
                toast.success(`Sueldo de ${money(resumen.sueldo)} registrado como pagado`);
              }}
            >
              Sí, pagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

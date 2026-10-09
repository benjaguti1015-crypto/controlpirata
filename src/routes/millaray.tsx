import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Check,
  Coins,
  CreditCard,
  PackageCheck,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { AlertaStockWhatsApp } from "@/components/AlertaStockWhatsApp";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { money, useStore, type Producto } from "@/lib/store";
import { ResumenMillaray } from "@/components/ResumenMillaray";
import { AdminGuard } from "@/components/adminguard";

export const Route = createFileRoute("/millaray")({
  head: () => ({
    meta: [
      { title: "Millaray · punto de venta | Dulces del Rey Pirata" },
      {
        name: "description",
        content:
          "Registro de ventas de Millaray en su punto de venta: stock asignado, traspasos, ventas con método de pago y control de cobros.",
      },
      { property: "og:title", content: "Millaray · punto de venta | Dulces del Rey Pirata" },
      {
        property: "og:description",
        content: "Ventas, pagos y stock del punto de venta de Millaray.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MillarayPage,
});

type Accion = "traspaso" | "devolucion";

const UMBRAL_MILLARAY = 5;

const titulos: Record<Accion, string> = {
  traspaso: "Traspasar a Millaray",
  devolucion: "Devolver al stock principal",
};

function MillarayPage() {
  const {
    productos,
    ventasMillaray,
    traspasarAMillaray,
    devolverDeMillaray,
    registrarVentaMillaray,
    marcarVentaMillarayPagada,
    eliminarVentaMillaray,
  } = useStore();

  // Diálogo de traspaso / devolución
  const [accion, setAccion] = useState<Accion | null>(null);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState("");

  // Formulario de venta
  const [ventaAbierta, setVentaAbierta] = useState(false);
  const [cliente, setCliente] = useState("");
  const [cantidadesVenta, setCantidadesVenta] = useState<Record<string, number>>({});
  const [descuentoVenta, setDescuentoVenta] = useState("");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [errorVenta, setErrorVenta] = useState("");

  const resumen = useMemo(() => {
    const unidades = productos.reduce((s, p) => s + (p.millaray ?? 0), 0);
    const valor = productos.reduce((s, p) => s + (p.millaray ?? 0) * p.precio, 0);
    return { unidades, valor };
  }, [productos]);

  const pendientesPorCobrar = useMemo(
    () =>
      ventasMillaray
        .filter((v) => !v.pagado)
        .reduce((s, v) => {
          const sub = v.precio * v.cantidad;
          const desc = v.descuento && v.descuento > 0 ? (sub * v.descuento) / 100 : 0;
          return s + Math.max(0, sub - desc);
        }, 0),
    [ventasMillaray],
  );

  // Filtramos para mostrar únicamente las ventas que NO están pagadas (al pagarlas, desaparecen de la vista)
  const ventasPendientes = useMemo(
    () => ventasMillaray.filter((v) => !v.pagado),
    [ventasMillaray]
  );

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

  const disponible =
    producto === null ? 0 : accion === "traspaso" ? producto.stock : (producto.millaray ?? 0);

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
      traspasarAMillaray(producto.id, n);
      toast.success(`${n} u. de ${producto.nombre} traspasadas a Millaray`);
    } else {
      devolverDeMillaray(producto.id, n);
      toast.success(`${n} u. devueltas al stock principal`);
    }
    cerrar();
  };

  const conStock = productos.filter((p) => (p.millaray ?? 0) > 0);

  const abrirVenta = () => {
    setCliente("");
    setCantidadesVenta({});
    setDescuentoVenta("");
    setMetodoPago("efectivo");
    setErrorVenta("");
    setVentaAbierta(true);
  };

  const lineasVenta = conStock
    .filter((p) => (cantidadesVenta[p.id] ?? 0) > 0)
    .map((p) => ({ producto: p, cantidad: cantidadesVenta[p.id]! }));
  const subtotalVentaCalc = lineasVenta.reduce((s, l) => s + l.cantidad * l.producto.precio, 0);
  const descVentaNum = Number(descuentoVenta) || 0;
  const totalVentaCalc = Math.max(0, subtotalVentaCalc - (subtotalVentaCalc * descVentaNum) / 100);

  const cambiarVenta = (p: Producto, delta: number) =>
    setCantidadesVenta((c) => ({
      ...c,
      [p.id]: Math.max(0, Math.min(p.millaray ?? 0, (c[p.id] ?? 0) + delta)),
    }));

  const confirmarVenta = () => {
    if (!cliente.trim()) {
      setErrorVenta("Ingresa el nombre del cliente");
      return;
    }
    if (lineasVenta.length === 0) {
      setErrorVenta("Agrega al menos una galleta");
      return;
    }

    const valDesc = descuentoVenta.trim() === "" ? undefined : Number(descuentoVenta);
    lineasVenta.forEach((l) =>
      registrarVentaMillaray(cliente.trim(), l.producto.id, l.cantidad, metodoPago, valDesc),
    );
    toast.success(
      `Venta registrada: ${lineasVenta.reduce((s, l) => s + l.cantidad, 0)} u. · ${money(totalVentaCalc)}`,
      { description: "Te amo Millaray ❤" },
    );
    setVentaAbierta(false);
  };

  return (
    <AdminGuard>
      <AppShell>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">MILLARAY</h1>
            <p className="text-sm text-muted-foreground">
              Ventas y stock de su punto de venta, separado del inventario principal
            </p>
          </div>
          <Button onClick={abrirVenta} disabled={conStock.length === 0}>
            <Plus className="h-4 w-4" /> Registrar venta
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
                  Galletas en poder de Millaray
                </p>
                <p className="text-lg font-semibold">{resumen.unidades} u.</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Coins className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Valor en punto de venta
                </p>
                <p className="text-lg font-semibold">{money(resumen.valor)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Pendiente por cobrar
                </p>
                <p className="text-lg font-semibold">{money(pendientesPorCobrar)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <ResumenMillaray />

        {/* Ventas pendientes */}
        <section className="mt-7">
          <h2 className="text-lg font-semibold">Ventas pendientes de pago</h2>
          <p className="text-xs text-muted-foreground">
            Al marcar la casilla de pagado, el pedido desaparecerá de esta lista
          </p>

          <div className="mt-3 space-y-2">
            {ventasPendientes.length === 0 ? (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    No hay ventas pendientes por cobrar. ¡Todo al día!
                  </p>
                </CardContent>
              </Card>
            ) : (
              ventasPendientes.map((v) => {
                const subV = v.precio * v.cantidad;
                const descV = v.descuento && v.descuento > 0 ? (subV * v.descuento) / 100 : 0;
                const totalV = Math.max(0, subV - descV);
                return (
                  <Card key={v.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <Checkbox
                        id={`pagado-${v.id}`}
                        checked={v.pagado}
                        onCheckedChange={() => {
                          marcarVentaMillarayPagada(v.id);
                          toast.success("Venta marcada como pagada");
                        }}
                        aria-label="Marcar como pagado"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{v.cliente}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.cantidad} u. · {v.nombre}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant={v.metodoPago === "efectivo" ? "secondary" : "outline"}>
                            {v.metodoPago === "efectivo" ? (
                              <Banknote className="h-3 w-3" />
                            ) : (
                              <CreditCard className="h-3 w-3" />
                            )}
                            {v.metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}
                          </Badge>
                          <Badge variant="secondary">Pendiente de pago</Badge>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="text-right">
                          <p className="text-sm font-semibold">{money(totalV)}</p>
                          {v.descuento && v.descuento > 0 ? (
                            <span className="text-[10px] text-primary font-medium">({v.descuento}% desc.)</span>
                          ) : null}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => {
                            eliminarVentaMillaray(v.id);
                            toast.success("Registro de venta eliminado");
                          }}
                          aria-label="Eliminar registro de venta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>

        {/* Stock por galleta */}
        <section className="mt-7">
          <h2 className="text-lg font-semibold">Stock asignado</h2>
          <div className="mt-3 space-y-3">
            {productos.length === 0 ? (
              <EmptyState
                icon={Store}
                title="Aún no hay galletas registradas"
                description="Registra productos en el inventario para poder traspasar unidades al punto de venta de Millaray."
              />
            ) : (
              productos.map((p) => {
                const enMillaray = p.millaray ?? 0;
                const millarayAgotado = enMillaray <= 0;
                const millarayCritico = !millarayAgotado && enMillaray <= UMBRAL_MILLARAY;
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
                          variant={enMillaray > 0 ? "default" : "secondary"}
                          className="shrink-0 whitespace-nowrap"
                        >
                          Millaray: {enMillaray} u.
                        </Badge>
                      </div>

                      <div className="mt-3 rounded-xl bg-secondary/70 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Valor asignado
                        </p>
                        <p className="text-sm font-semibold">{money(enMillaray * p.precio)}</p>
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
                          disabled={enMillaray <= 0}
                          onClick={() => abrir("devolucion", p)}
                        >
                          <Undo2 className="h-4 w-4" /> Devolver
                        </Button>
                      </div>

                      {millarayAgotado ? (
                        <div className="mt-3 space-y-2">
                          <Badge variant="destructive">
                            <TriangleAlert className="h-3 w-3" /> Agotada en Millaray
                          </Badge>
                          <AlertaStockWhatsApp
                            tipo="millaray"
                            nombre={p.nombre}
                            estado="agotado"
                            detalle="0 unidades"
                          />
                        </div>
                      ) : millarayCritico ? (
                        <div className="mt-3 space-y-2">
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 hover:bg-amber-100"
                          >
                            <TriangleAlert className="h-3 w-3" /> Stock crítico en Millaray
                          </Badge>
                          <AlertaStockWhatsApp
                            tipo="millaray"
                            nombre={p.nombre}
                            estado="crítico"
                            detalle={`${enMillaray} unidades (mínimo ${UMBRAL_MILLARAY})`}
                          />
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {conStock.length === 0 && productos.length > 0 ? (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Millaray aún no tiene galletas asignadas. Usa “Traspasar” para enviarle unidades.
            </p>
          ) : null}
        </section>

        {/* Diálogo traspaso / devolución */}
        <Dialog open={accion !== null} onOpenChange={(o) => (o ? null : cerrar())}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{accion ? titulos[accion] : ""}</DialogTitle>
              <DialogDescription>
                {producto?.nombre} · disponibles: {disponible} u.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="millaray-cantidad">Cantidad</Label>
              <Input
                id="millaray-cantidad"
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

        {/* Diálogo registrar venta */}
        <Dialog open={ventaAbierta} onOpenChange={setVentaAbierta}>
          <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar venta de Millaray</DialogTitle>
              <DialogDescription>
                Se descuenta automáticamente del stock de Millaray
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="venta-cliente">Nombre del cliente</Label>
                <Input
                  id="venta-cliente"
                  value={cliente}
                  onChange={(e) => {
                    setCliente(e.target.value);
                    setErrorVenta("");
                  }}
                  placeholder="Ej: Doña Rosa"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Galletas</Label>
                <ul className="space-y-1.5">
                  {conStock.map((p) => {
                    const n = cantidadesVenta[p.id] ?? 0;
                    return (
                      <li key={p.id} className="flex items-center gap-2 rounded-xl border p-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.millaray ?? 0} u. · {money(p.precio)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          disabled={n === 0}
                          onClick={() => cambiarVenta(p, -1)}
                          aria-label={`Quitar ${p.nombre}`}
                        >
                          −
                        </Button>
                        <span className="w-6 text-center font-semibold tabular-nums">{n}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          disabled={n >= (p.millaray ?? 0)}
                          onClick={() => cambiarVenta(p, 1)}
                          aria-label={`Agregar ${p.nombre}`}
                        >
                          +
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="venta-descuento">Descuento (%)</Label>
                  <Input
                    id="venta-descuento"
                    type="number"
                    min={0}
                    max={100}
                    value={descuentoVenta}
                    onChange={(e) => {
                      setDescuentoVenta(e.target.value);
                      setErrorVenta("");
                    }}
                    placeholder="Ej: 50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Método de pago</Label>
                <Select
                  value={metodoPago}
                  onValueChange={(v) => setMetodoPago(v as "efectivo" | "transferencia")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {errorVenta ? <p className="text-xs text-destructive">{errorVenta}</p> : null}
              {lineasVenta.length > 0 ? (
                <div className="rounded-xl bg-secondary/70 px-3 py-2 text-sm space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>{money(subtotalVentaCalc)}</span>
                  </div>
                  {descVentaNum > 0 ? (
                    <div className="flex justify-between text-xs text-primary font-medium">
                      <span>Descuento ({descVentaNum}%):</span>
                      <span>-{money((subtotalVentaCalc * descVentaNum) / 100)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-semibold pt-1 border-t border-border/50">
                    <span>Total a cobrar:</span>
                    <span>{money(totalVentaCalc)}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setVentaAbierta(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarVenta}>Guardar venta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AdminGuard>
  );
}
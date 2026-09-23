import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Instagram,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore, money, totalPedido, type ItemPedido, type Pedido } from "@/lib/store";
import { AdminGuard } from "@/components/adminguard";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos y entregas | Dulces del Rey Pirata" },
      {
        name: "description",
        content:
          "Registra pedidos de galletas, valida el stock disponible y descuenta inventario al marcar cada pedido como entregado.",
      },
      { property: "og:title", content: "Pedidos y entregas | Dulces del Rey Pirata" },
      {
        property: "og:description",
        content: "Gestiona pedidos pendientes y entregados con descuento automático de stock.",
      },
    ],
  }),
  component: PedidosPage,
});

type Borrador = { productoId: string; cantidad: string };

function PedidosPage() {
  const { productos, pedidos, agregarPedido, actualizarPedido, entregarPedido, eliminarPedido } = useStore();
  const [abierto, setAbierto] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null);
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [lineas, setLineas] = useState<Borrador[]>([{ productoId: "", cantidad: "1" }]);
  const [errores, setErrores] = useState<string[]>([]);
  const [confirmarStock, setConfirmarStock] = useState(false);

  const pendientes = pedidos.filter((p) => p.estado === "pendiente");
  const entregados = pedidos.filter((p) => p.estado === "entregado");

  const hayFaltaStock = useMemo(
    () =>
      lineas.some((l) => {
        const prod = productos.find((p) => p.id === l.productoId);
        const cant = Number(l.cantidad);
        return !!prod && Number.isFinite(cant) && cant > prod.stock;
      }),
    [lineas, productos],
  );

  const totalBorrador = lineas.reduce((s, l) => {
    const prod = productos.find((p) => p.id === l.productoId);
    const cant = Number(l.cantidad);
    return s + (prod && Number.isFinite(cant) && cant > 0 ? prod.precio * cant : 0);
  }, 0);

  const abrirNuevo = () => {
    setPedidoEditando(null);
    setCliente("");
    setTelefono("");
    setFecha(new Date().toISOString().slice(0, 10));
    setLineas([{ productoId: "", cantidad: "1" }]);
    setErrores([]);
    setConfirmarStock(false);
    setAbierto(true);
  };

  const abrirEditar = (p: Pedido) => {
    setPedidoEditando(p);
    setCliente(p.cliente);
    setTelefono(p.telefono || "");
    setFecha(p.fecha);
    setLineas(
      p.items.map((i) => ({
        productoId: i.productoId,
        cantidad: String(i.cantidad),
      }))
    );
    setErrores([]);
    setConfirmarStock(false);
    setAbierto(true);
  };

  const guardar = () => {
    const errs: string[] = [];
    if (!cliente.trim()) errs.push("Ingresa el nombre del cliente.");
    if (!fecha) errs.push("Selecciona la fecha del pedido.");

    const items: ItemPedido[] = [];
    lineas.forEach((l, i) => {
      const prod = productos.find((p) => p.id === l.productoId);
      const cant = Number(l.cantidad);
      if (!prod) {
        errs.push(`Selecciona un producto en la línea ${i + 1}.`);
        return;
      }
      if (!Number.isFinite(cant) || !Number.isInteger(cant) || cant <= 0) {
        errs.push(`La cantidad de la línea ${i + 1} debe ser un entero mayor a 0.`);
        return;
      }
      items.push({
        productoId: prod.id,
        nombre: prod.nombre,
        cantidad: cant,
        precio: prod.precio,
        costo: prod.costo,
      });
    });

    if (items.length === 0) errs.push("Agrega al menos un producto al pedido.");
    setErrores(errs);
    if (errs.length) return;

    if (hayFaltaStock && !confirmarStock) {
      toast.warning("Stock insuficiente: confirma para registrar de todos modos.");
      return;
    }

    if (pedidoEditando) {
      actualizarPedido(pedidoEditando.id, cliente.trim(), telefono.trim(), fecha, items);
      toast.success("Pedido actualizado");
    } else {
      agregarPedido(cliente.trim(), telefono.trim(), fecha, items);
      toast.success("Pedido registrado");
    }
    setAbierto(false);
  };

  const limpiarTelefono = (numero: string) => numero.replace(/\D/g, "");

  const mensajeWhatsApp = (p: Pedido) => {
    const lineasTexto = p.items
      .map((i) => `• ${i.cantidad} x ${i.nombre} — ${money(i.precio * i.cantidad)}`)
      .join("\n");
    return `Hola ${p.cliente}, tu pedido de Dulces del Rey Pirata está listo:\n\n${lineasTexto}\n\nTotal a pagar: ${money(totalPedido(p))}\nFecha del pedido: ${p.fecha}`;
  };

  const mensajeInstagram = (p: Pedido) => {
    const lineasTexto = p.items.map((i) => `• ${i.cantidad} x ${i.nombre}`).join("\n");
    return `🍪 Pedido — Dulces del Rey Pirata\n\nCliente: ${p.cliente}\nFecha: ${p.fecha}\n\nProductos:\n${lineasTexto}\n\n💰 Total: ${money(totalPedido(p))}\n\n¡Gracias por tu preferencia! ✨`;
  };

  const abrirWhatsApp = (p: Pedido) => {
    const numero = limpiarTelefono(p.telefono || "");
    if (!numero) {
      toast.error("Este pedido no tiene teléfono registrado");
      return;
    }
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensajeWhatsApp(p))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copiarResumenInstagram = async (p: Pedido) => {
    try {
      await navigator.clipboard.writeText(mensajeInstagram(p));
      toast.success("¡Resumen copiado para Instagram!");
    } catch {
      toast.error("No se pudo copiar el resumen");
    }
  };

  return (
    <AdminGuard>
      <AppShell>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">Pedidos</h1>
            <p className="text-sm text-muted-foreground">Registro, seguimiento y entrega</p>
          </div>
          <Button onClick={abrirNuevo} className="shrink-0" disabled={productos.length === 0}>
            <Plus className="h-4 w-4" /> Pedido
          </Button>
        </div>

        {productos.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Package}
              title="Primero registra tus galletas"
              description="Necesitas al menos un producto en el inventario para poder crear pedidos."
              action={
                <Button asChild>
                  <Link to="/productos">Ir al inventario</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <Tabs defaultValue="pendientes" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="pendientes" className="flex-1">
                Pendientes ({pendientes.length})
              </TabsTrigger>
              <TabsTrigger value="entregados" className="flex-1">
                Entregados ({entregados.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendientes" className="mt-4 space-y-3">
              {pendientes.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No hay pedidos pendientes"
                  description="Cuando registres un pedido aparecerá aquí hasta que lo marques como entregado."
                  action={
                    <Button onClick={abrirNuevo}>
                      <Plus className="h-4 w-4" /> Registrar pedido
                    </Button>
                  }
                />
              ) : (
                pendientes.map((p) => {
                  const insuficiente = p.items.some((i) => {
                    const prod = productos.find((x) => x.id === i.productoId);
                    return !prod || i.cantidad > prod.stock;
                  });
                  return (
                    <Card key={p.id}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-base font-semibold">{p.cliente}</h2>
                            <p className="text-xs text-muted-foreground">{p.fecha}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="shrink-0 font-semibold">{money(totalPedido(p))}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => abrirEditar(p)}
                              title="Editar pedido"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar pedido</span>
                            </Button>
                          </div>
                        </div>

                        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                          {p.items.map((i) => (
                            <li key={i.productoId} className="flex justify-between gap-3">
                              <span className="truncate">
                                {i.cantidad} × {i.nombre}
                              </span>
                              <span className="shrink-0">{money(i.precio * i.cantidad)}</span>
                            </li>
                          ))}
                        </ul>

                        {insuficiente ? (
                          <Badge variant="destructive" className="mt-3">
                            <TriangleAlert className="h-3 w-3" /> Stock insuficiente
                          </Badge>
                        ) : null}

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => abrirWhatsApp(p)}
                          >
                            <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => copiarResumenInstagram(p)}
                          >
                            <Instagram className="h-4 w-4" /> Copiar
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() => {
                              entregarPedido(p.id);
                              toast.success("Pedido entregado y stock descontado");
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Entregar
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            onClick={() => {
                              eliminarPedido(p.id);
                              toast.success("Pedido eliminado");
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Eliminar pedido</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="entregados" className="mt-4 space-y-3">
              {entregados.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="Todavía no hay entregas"
                  description="Los pedidos entregados suman a tus ingresos y utilidades del panel."
                />
              ) : (
                entregados.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold">{p.cliente}</h2>
                          <p className="text-xs text-muted-foreground">{p.fecha}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold">{money(totalPedido(p))}</p>
                          <Badge variant="secondary" className="mt-1">
                            Entregado
                          </Badge>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {p.items.map((i) => (
                          <li key={i.productoId} className="truncate">
                            {i.cantidad} × {i.nombre}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => abrirWhatsApp(p)}
                        >
                          <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => copiarResumenInstagram(p)}
                        >
                          <Instagram className="h-4 w-4" /> Copiar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={abierto} onOpenChange={setAbierto}>
          <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{pedidoEditando ? "Editar pedido" : "Nuevo pedido"}</DialogTitle>
              <DialogDescription>
                {pedidoEditando ? "Modifica los productos o datos del pedido." : "Agrega uno o varios productos al mismo pedido."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono (opcional)</Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+56912345678 para WhatsApp"
                />
                <p className="text-xs text-muted-foreground">
                  Se usa para generar el enlace de WhatsApp.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fecha">Fecha del pedido</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Productos</Label>
                {lineas.map((l, idx) => {
                  const prod = productos.find((p) => p.id === l.productoId);
                  const cant = Number(l.cantidad);
                  const falta = !!prod && Number.isFinite(cant) && cant > prod.stock;
                  return (
                    <div key={idx} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex gap-2">
                        <Select
                          value={l.productoId}
                          onValueChange={(v) =>
                            setLineas(
                              lineas.map((x, i) => (i === idx ? { ...x, productoId: v } : x)),
                            )
                          }
                        >
                          <SelectTrigger className="min-w-0 flex-1">
                            <SelectValue placeholder="Elegir galleta" />
                          </SelectTrigger>
                          <SelectContent>
                            {productos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nombre} · {p.stock} u.
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          className="w-20 shrink-0"
                          value={l.cantidad}
                          onChange={(e) =>
                            setLineas(
                              lineas.map((x, i) =>
                                i === idx ? { ...x, cantidad: e.target.value } : x,
                              ),
                            )
                          }
                        />
                        {lineas.length > 1 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => setLineas(lineas.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Quitar</span>
                          </Button>
                        ) : null}
                      </div>
                      {falta ? (
                        <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                          <TriangleAlert className="h-3 w-3" /> Solo hay {prod?.stock} unidades en
                          stock
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLineas([...lineas, { productoId: "", cantidad: "1" }])}
                >
                  <Plus className="h-4 w-4" /> Agregar otro producto
                </Button>
              </div>

              <div className="rounded-xl bg-secondary/70 px-3 py-2 text-sm">
                Total del pedido: <span className="font-semibold">{money(totalBorrador)}</span>
              </div>

              {hayFaltaStock ? (
                <label className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[oklch(0.55_0.19_27)]"
                    checked={confirmarStock}
                    onChange={(e) => setConfirmarStock(e.target.checked)}
                  />
                  <span>
                    El stock es insuficiente para algunos productos. Confirmo que quiero registrar el
                    pedido de todos modos.
                  </span>
                </label>
              ) : null}

              {errores.length > 0 ? (
                <ul className="space-y-1 text-xs text-destructive">
                  {errores.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button onClick={guardar}>{pedidoEditando ? "Guardar cambios" : "Registrar pedido"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AdminGuard>
  );
}
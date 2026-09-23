import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag, CheckCircle2, MessageCircle, Plus, Minus, Package } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, useStore, type ItemPedido } from "@/lib/store";

export const Route = createFileRoute("/pedidos-online")({
  head: () => ({
    meta: [
      { title: "Haz tu pedido | Dulces del Rey Pirata" },
      {
        name: "description",
        content: "Haz tu pedido online de galletas artesanales de forma rápida y directa.",
      },
    ],
  }),
  component: PedidosOnlinePage,
});

function PedidosOnlinePage() {
  const { productos, agregarPedido } = useStore();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  // Cantidades seleccionadas por cada producto (productoId -> cantidad)
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [enviado, setEnviado] = useState(false);
  const [mensajeWspUrl, setMensajeWspUrl] = useState("");

  const cambiarCantidad = (id: string, delta: number, stockMaximo: number) => {
    setCantidades((prev) => {
      const actual = prev[id] || 0;
      const nuevo = Math.max(0, Math.min(stockMaximo, actual + delta));
      if (nuevo === 0) {
        const copia = { ...prev };
        delete copia[id];
        return copia;
      }
      return { ...prev, [id]: nuevo };
    });
  };

  const itemsSeleccionados: ItemPedido[] = Object.entries(cantidades)
    .map(([prodId, cant]) => {
      const prod = productos.find((p) => p.id === prodId);
      if (!prod || cant <= 0) return null;
      return {
        productoId: prod.id,
        nombre: prod.nombre,
        cantidad: cant,
        precio: prod.precio,
        costo: prod.costo,
      };
    })
    .filter((item): item is ItemPedido => item !== null);

  const totalGeneral = itemsSeleccionados.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const confirmarPedidoOnline = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim() || !apellido.trim()) {
      toast.error("Por favor ingresa tu nombre y apellido");
      return;
    }
    if (!telefono.trim()) {
      toast.error("Por favor ingresa tu número de teléfono");
      return;
    }
    if (itemsSeleccionados.length === 0) {
      toast.error("Selecciona al menos un producto para tu pedido");
      return;
    }

    const clienteCompleto = `${nombre.trim()} ${apellido.trim()}`;

    // 1. Registra el pedido en tu store (esto descuenta automáticamente el stock de inmediato)
    agregarPedido(clienteCompleto, telefono.trim(), fecha, itemsSeleccionados);

    // 2. Prepara el mensaje de WhatsApp para tu número personal: +56949424791
    const numeroReyPirata = "56949424791";
    const lineasTexto = itemsSeleccionados
      .map((i) => `• ${i.cantidad}x ${i.nombre} (${money(i.precio * i.cantidad)})`)
      .join("\n");

    const textoWsp = `🍪 *¡Nuevo Pedido Online!* — Dulces del Rey Pirata\n\n*Cliente:* ${clienteCompleto}\n*Teléfono:* ${telefono.trim()}\n*Fecha de entrega:* ${fecha}\n\n*Productos:*\n${lineasTexto}\n\n*Total a pagar:* ${money(totalGeneral)}\n\n¡Hola! Vengo a confirmar mi pedido por la web. ✨`;

    const urlWsp = `https://wa.me/${numeroReyPirata}?text=${encodeURIComponent(textoWsp)}`;
    setMensajeWspUrl(urlWsp);
    setEnviado(true);
    toast.success("¡Pedido registrado con éxito!");
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-secondary/30 px-4 py-12 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-6 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">¡Tu pedido ya está listo!</h1>
          <p className="text-sm text-muted-foreground">
            Hemos guardado tu pedido correctamente y descontado el stock. Para enviarle el detalle directamente a WhatsApp al Rey Pirata, haz clic en el botón de abajo:
          </p>
          <div className="pt-2">
            <Button asChild className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <a href={mensajeWspUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5" /> Enviar comprobante por WhatsApp
              </a>
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full text-xs text-muted-foreground"
            onClick={() => {
              setEnviado(false);
              setCantidades({});
              setNombre("");
              setApellido("");
              setTelefono("");
            }}
          >
            Hacer otro pedido
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Dulces del Rey Pirata 🏴‍☠️🍪</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona tus galletas favoritas y haz tu pedido en tiempo real.
          </p>
        </div>

        <form onSubmit={confirmarPedidoOnline} className="space-y-6">
          {/* Datos del cliente */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> 1. Tus datos de contacto
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    required
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Tu apellido"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="telefono">Número de Teléfono</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+569..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha">Fecha del pedido</Label>
                  <Input
                    id="fecha"
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Listado de Productos */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" /> 2. Elige tus galletas (Stock en tiempo real)
              </h2>

              <div className="space-y-3">
                {productos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No hay productos disponibles por el momento.
                  </p>
                ) : (
                  productos.map((prod) => {
                    const stockDisponible = prod.stock;
                    const cantidadElegida = cantidades[prod.id] || 0;
                    const agotado = stockDisponible <= 0;

                    return (
                      <div
                        key={prod.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          agotado ? "bg-muted/40 opacity-60" : "bg-card"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold truncate text-sm">{prod.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {money(prod.precio)} · {agotado ? "Agotado" : `Disponibles: ${stockDisponible} u.`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={cantidadElegida === 0}
                            onClick={() => cambiarCantidad(prod.id, -1, stockDisponible)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{cantidadElegida}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={agotado || cantidadElegida >= stockDisponible}
                            onClick={() => cambiarCantidad(prod.id, 1, stockDisponible)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumen y Botón de Enviar */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center text-base font-bold">
                <span>Total estimado:</span>
                <span className="text-xl text-primary">{money(totalGeneral)}</span>
              </div>

              <Button type="submit" className="w-full gap-2 text-base h-11" disabled={itemsSeleccionados.length === 0}>
                <MessageCircle className="w-5 h-5" /> Confirmar y Enviar Pedido
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
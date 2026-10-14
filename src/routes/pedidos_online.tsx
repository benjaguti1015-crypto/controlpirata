import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/pedidos_online")({
  head: () => ({
    meta: [
      { title: "Haz tu pedido | Dulces del Rey Pirata" },
      {
        name: "description",
        content: "Haz tu pedido de galletas artesanales directo por WhatsApp.",
      },
    ],
  }),
  component: PedidosOnlinePage,
});

// Pedidos online desactivados por seguridad: la página no toca la base de datos.
const URL_WSP = `https://wa.me/56949424791?text=${encodeURIComponent(
  "¡Hola! Quiero hacer un pedido de galletas 🍪",
)}`;

function PedidosOnlinePage() {
  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-12 flex items-center justify-center">
      <Card className="max-w-md w-full text-center p-6 space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Dulces del Rey Pirata 🏴‍☠️🍪</h1>
        <p className="text-sm text-muted-foreground">
          Los pedidos online estarán disponibles pronto. Mientras tanto, haz tu pedido por WhatsApp.
        </p>
        <Button asChild className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <a href={URL_WSP} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-5 h-5" /> Pedir por WhatsApp
          </a>
        </Button>
      </Card>
    </div>
  );
}

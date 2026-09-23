import { MessageCircleWarning } from "lucide-react";

import { Button } from "@/components/ui/button";

const NUMERO_ALERTAS = "56949424791";

type Estado = "agotado" | "crítico";
type Tipo = "producto" | "insumo" | "millaray";

const mensajes: Record<Tipo, (nombre: string, estado: Estado, detalle: string) => string> = {
  producto: (nombre, estado, detalle) =>
    `⚠️ *Alerta de stock — Dulces del Rey Pirata*\n\n` +
    `🍪 Producto: *${nombre}*\n` +
    `Estado: ${estado === "agotado" ? "🔴 *AGOTADO*" : "🟡 *STOCK CRÍTICO*"}\n` +
    `Stock actual: ${detalle}\n\n` +
    `Se necesita hornear / reponer unidades a la brevedad.`,
  insumo: (nombre, estado, detalle) =>
    `⚠️ *Alerta de insumo — Dulces del Rey Pirata*\n\n` +
    `🌾 Insumo: *${nombre}*\n` +
    `Estado: ${estado === "agotado" ? "🔴 *AGOTADO*" : "🟡 *STOCK CRÍTICO*"}\n` +
    `Stock actual: ${detalle}\n\n` +
    `Se necesita comprar este insumo para seguir horneando.`,
  millaray: (nombre, estado, detalle) =>
    `⚠️ *Alerta punto de venta — Dulces del Rey Pirata*\n\n` +
    `🏪 Galleta: *${nombre}*\n` +
    `Estado: ${estado === "agotado" ? "🔴 *AGOTADA*" : "🟡 *STOCK CRÍTICO*"} en Millaray\n` +
    `Stock en punto de venta: ${detalle}\n\n` +
    `Se necesita traspasar más unidades para Millaray.`,
};

export function AlertaStockWhatsApp({
  nombre,
  estado,
  detalle,
  tipo,
}: {
  nombre: string;
  estado: Estado;
  detalle: string;
  tipo: Tipo;
}) {
  const avisar = () => {
    const texto = encodeURIComponent(mensajes[tipo](nombre, estado, detalle));
    window.open(`https://wa.me/${NUMERO_ALERTAS}?text=${texto}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={estado === "agotado" ? "destructive" : "outline"}
      className={
        estado === "agotado"
          ? "w-full"
          : "w-full border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
      }
      onClick={avisar}
    >
      <MessageCircleWarning className="h-4 w-4" /> Avisar por WhatsApp
    </Button>
  );
}

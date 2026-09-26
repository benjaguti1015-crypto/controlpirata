import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy, WalletCards, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/datos-pago")({
  head: () => ({
    meta: [
      { title: "Datos para Transferencia | Dulces del Rey Pirata" },
      {
        name: "description",
        content: "Datos oficiales de transferencia para pagar tus pedidos de Dulces del Rey Pirata.",
      },
    ],
  }),
  component: DatosPagoPage,
});

function DatosPagoPage() {
  const [copiadoCampo, setCopiadoCampo] = useState<string | null>(null);

  const datosBancarios = {
    banco: "Mercado Pago",
    tipoCuenta: "Cuenta Vista",
    rut: "21.689.819-2",
    nroCuenta: "1058724274",
    nombre: "Benjamin Gutierrez",
  };

  const copiarTexto = (texto: string, campo: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoCampo(campo);
    toast.success(`¡${campo} copiado al portapapeles!`);
    setTimeout(() => {
      setCopiadoCampo(null);
    }, 2000);
  };

  const copiarTodo = () => {
    const textoCompleto = `Banco: ${datosBancarios.banco}
Tipo de Cuenta: ${datosBancarios.tipoCuenta}
N° de Cuenta: ${datosBancarios.nroCuenta}
RUT: ${datosBancarios.rut}
Nombre: ${datosBancarios.nombre}`;

    navigator.clipboard.writeText(textoCompleto);
    toast.success("¡Todos los datos bancarios fueron copiados!");
  };

  return (
    <div className="min-h-screen bg-secondary/20 py-10 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        
        {/* Cabecera */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <WalletCards className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dulces del Rey Pirata 🏴‍☠️</h1>
          <p className="text-sm text-muted-foreground">
            Datos oficiales para realizar tu transferencia y confirmar tu pedido.
          </p>
        </div>

        {/* Tarjeta de Datos */}
        <Card className="border-border/60 shadow-lg">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span>Datos Bancarios</span>
              <span className="text-xs font-normal px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Cuenta Segura
              </span>
            </CardTitle>
            <CardDescription>Haz clic en el botón de al lado para copiar cada dato de forma rápida.</CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            
            {/* Banco */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Banco</p>
                <p className="text-sm font-semibold truncate">{datosBancarios.banco}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 h-8 text-xs"
                onClick={() => copiarTexto(datosBancarios.banco, "Banco")}
              >
                {copiadoCampo === "Banco" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoCampo === "Banco" ? "Copiado" : "Copiar"}
              </Button>
            </div>

            {/* Tipo de Cuenta */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo de Cuenta</p>
                <p className="text-sm font-semibold truncate">{datosBancarios.tipoCuenta}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 h-8 text-xs"
                onClick={() => copiarTexto(datosBancarios.tipoCuenta, "Tipo de cuenta")}
              >
                {copiadoCampo === "Tipo de cuenta" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoCampo === "Tipo de cuenta" ? "Copiado" : "Copiar"}
              </Button>
            </div>

            {/* Número de Cuenta */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Número de Cuenta</p>
                <p className="text-sm font-semibold truncate">{datosBancarios.nroCuenta}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 h-8 text-xs"
                onClick={() => copiarTexto(datosBancarios.nroCuenta, "N° de cuenta")}
              >
                {copiadoCampo === "N° de cuenta" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoCampo === "N° de cuenta" ? "Copiado" : "Copiar"}
              </Button>
            </div>

            {/* RUT */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">RUT</p>
                <p className="text-sm font-semibold truncate">{datosBancarios.rut}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 h-8 text-xs"
                onClick={() => copiarTexto(datosBancarios.rut, "RUT")}
              >
                {copiadoCampo === "RUT" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoCampo === "RUT" ? "Copiado" : "Copiar"}
              </Button>
            </div>

            {/* Titular / Nombre */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nombre / Titular</p>
                <p className="text-sm font-semibold truncate">{datosBancarios.nombre}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 h-8 text-xs"
                onClick={() => copiarTexto(datosBancarios.nombre, "Nombre")}
              >
                {copiadoCampo === "Nombre" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoCampo === "Nombre" ? "Copiado" : "Copiar"}
              </Button>
            </div>

            {/* Botón principal para copiar todo */}
            <div className="pt-2">
              <Button onClick={copiarTodo} className="w-full gap-2 h-11 text-sm font-medium">
                <Copy className="w-4 h-4" /> Copiar todos los datos
              </Button>
            </div>

          </CardContent>
        </Card>

        {/* Nota al pie */}
        <p className="text-center text-xs text-muted-foreground">
          Recuerda enviar el comprobante de transferencia por WhatsApp para despachar tu pedido. ¡Gracias! ✨
        </p>

      </div>
    </div>
  );
}
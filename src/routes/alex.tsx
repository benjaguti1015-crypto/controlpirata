import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Banknote, CreditCard, HandCoins, KeyRound, LogOut, Minus, Undo2 } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  SUELDO_POR_GALLETA,
  money,
  totalVentaAlex,
  unidadesVentaAlex,
  useStore,
  type VentaAlex,
} from "@/lib/store";

export const Route = createFileRoute("/alex")({
  head: () => ({
    meta: [{ title: "Chico Alex | Dulces del Rey Pirata" }],
  }),
  component: AlexPage,
});

type StockAlex = { productoId: string; nombre: string; precio: number; cantidad: number };
type Panel = { stock: StockAlex[]; ventas: VentaAlex[] };

// Mensajes propios de las funciones (P0001); el resto se oculta
const mensajeError = (e: { code?: string; message: string }) =>
  e.code === "P0001" ? e.message : "No se pudo conectar. Intenta de nuevo";

function AlexPage() {
  const { sesionAlex, iniciarSesionAlex } = useStore();
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (sesionAlex === null) return <div className="min-h-screen bg-secondary/30" />;

  if (!sesionAlex) {
    const entrar = async (e: React.FormEvent) => {
      e.preventDefault();
      setEnviando(true);
      const ok = await iniciarSesionAlex(password);
      setEnviando(false);
      if (ok) setPassword("");
      else toast.error("Contraseña incorrecta");
    };
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-xl">Chico Alex</CardTitle>
            <CardDescription>Ingresa tu contraseña para vender</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={entrar} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Contraseña"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={enviando || !password}>
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PanelAlex />;
}

function PanelAlex() {
  const { cerrarSesion } = useStore();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [cliente, setCliente] = useState("");
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia">("efectivo");
  const [enviando, setEnviando] = useState(false);
  const [deshacer, setDeshacer] = useState<VentaAlex | null>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.rpc("alex_panel");
    if (error) {
      toast.error(mensajeError(error));
      return;
    }
    const p = data as unknown as Panel;
    setPanel({
      stock: (p.stock ?? []).map((s) => ({
        ...s,
        precio: Number(s.precio),
        cantidad: Number(s.cantidad),
      })),
      ventas: p.ventas ?? [],
    });
  }, []);

  // Refresca al abrir, al volver a la app y cada 15 s (el dueño puede traspasar en cualquier momento)
  useEffect(() => {
    void cargar();
    const alVolver = () => {
      if (document.visibilityState === "visible") void cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    const intervalo = window.setInterval(alVolver, 15000);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
      window.clearInterval(intervalo);
    };
  }, [cargar]);

  const stock = panel?.stock ?? [];
  const ventas = panel?.ventas ?? [];
  const items = stock
    .filter((s) => (cantidades[s.productoId] ?? 0) > 0)
    .map((s) => ({ ...s, cantidad: cantidades[s.productoId]! }));
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const galletasVendidas = ventas.reduce((s, v) => s + unidadesVentaAlex(v), 0);

  const cambiar = (id: string, delta: number, max: number) =>
    setCantidades((c) => ({ ...c, [id]: Math.max(0, Math.min(max, (c[id] ?? 0) + delta)) }));

  const registrar = async () => {
    setEnviando(true);
    const { error } = await supabase.rpc("alex_vender", {
      p_cliente: cliente.trim(),
      p_items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
      p_metodo: metodo,
    });
    setEnviando(false);
    if (error) {
      toast.error(mensajeError(error));
      void cargar();
      return;
    }
    toast.success(`Venta registrada · ${money(total)}`, {
      description: `+${money(items.reduce((s, i) => s + i.cantidad, 0) * SUELDO_POR_GALLETA)} a tu sueldo`,
    });
    setCantidades({});
    setCliente("");
    setMetodo("efectivo");
    void cargar();
  };

  const confirmarDeshacer = async () => {
    if (!deshacer) return;
    const { error } = await supabase.rpc("alex_deshacer", { p_venta_id: deshacer.id });
    setDeshacer(null);
    if (error) {
      toast.error(mensajeError(error));
      return;
    }
    toast.success("Venta deshecha, las galletas volvieron a tu stock");
    void cargar();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <span className="font-display text-base font-semibold">Chico Alex</span>
          <button
            type="button"
            onClick={() => void cerrarSesion()}
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 py-5">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <HandCoins className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Tu sueldo por cobrar
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {money(galletasVendidas * SUELDO_POR_GALLETA)}
              </p>
              <p className="text-xs text-muted-foreground">
                {galletasVendidas} galletas × {money(SUELDO_POR_GALLETA)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-base font-semibold">Venta rápida</h2>
            {panel === null ? (
              <div className="mt-3 h-24 animate-pulse rounded-2xl bg-secondary/60" />
            ) : stock.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No tienes galletas asignadas. Pídele al dueño que te traspase.
              </p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {stock.map((s) => {
                    const n = cantidades[s.productoId] ?? 0;
                    return (
                      <div key={s.productoId} className="relative">
                        <button
                          type="button"
                          disabled={n >= s.cantidad}
                          onClick={() => cambiar(s.productoId, 1, s.cantidad)}
                          className={`flex min-h-[4.5rem] w-full touch-manipulation flex-col items-start justify-between rounded-2xl border p-3 text-left transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 ${
                            n > 0 ? "border-primary bg-primary/10" : "border-border bg-card"
                          }`}
                        >
                          <span className="line-clamp-2 text-sm font-semibold leading-tight">
                            {s.nombre}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {money(s.precio)} · {s.cantidad - n} u.
                          </span>
                        </button>
                        {n > 0 && (
                          <div className="absolute right-2 top-2 flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Quitar ${s.nombre}`}
                              onClick={() => cambiar(s.productoId, -1, s.cantidad)}
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
                      ["efectivo", "Efectivo"],
                      ["transferencia", "Transferencia"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMetodo(v)}
                      className={`min-h-12 touch-manipulation rounded-xl border text-sm font-semibold transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] ${
                        metodo === v
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <Input
                  className="mt-3 h-12 text-base"
                  placeholder="Cliente (opcional)"
                  maxLength={60}
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                />

                <Button
                  className="mt-3 h-14 w-full text-base transition-transform duration-150 ease-out active:scale-[0.98]"
                  disabled={items.length === 0 || enviando}
                  onClick={() => void registrar()}
                >
                  {items.length === 0
                    ? "Toca una galleta para empezar"
                    : `Registrar · ${money(total)}`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <section>
          <h2 className="text-base font-semibold">Mis ventas</h2>
          <p className="text-xs text-muted-foreground">Desde tu último pago de sueldo</p>
          <div className="mt-3 space-y-2">
            {ventas.length === 0 ? (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Aún no tienes ventas.</p>
                </CardContent>
              </Card>
            ) : (
              ventas.map((v) => (
                <Card key={v.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                      {v.metodoPago === "efectivo" ? (
                        <Banknote className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {v.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(v.fecha).toLocaleString("es-CL", {
                          timeZone: "America/Santiago",
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {v.cliente ? ` · ${v.cliente}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {money(totalVentaAlex(v))}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground"
                      onClick={() => setDeshacer(v)}
                      aria-label="Deshacer venta"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </main>

      <AlertDialog open={deshacer !== null} onOpenChange={(o) => (o ? null : setDeshacer(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deshacer esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              {deshacer
                ? `${deshacer.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")} · ${money(totalVentaAlex(deshacer))}. Las galletas vuelven a tu stock.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarDeshacer()}>
              Sí, deshacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

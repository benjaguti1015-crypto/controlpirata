import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BarChart3,
  CalendarCheck,
  Clock,
  Coins,
  Cookie,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HistorialCierres } from "@/components/HistorialCierres";
import { useStore, money, totalPedido, costoPedido } from "@/lib/store";
import { toast } from "sonner";
import { AdminGuard } from "@/components/AdminGuard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel financiero | Dulces del Rey Pirata" },
      {
        name: "description",
        content:
          "Panel de control para galletas artesanales: ingresos, costos, utilidad neta real y pedidos pendientes en un solo lugar.",
      },
      { property: "og:title", content: "Panel financiero | Dulces del Rey Pirata" },
      {
        property: "og:description",
        content: "Controla ventas, costos y utilidades de tu emprendimiento de galletas.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { productos, pedidos, cierres, hidratado, cerrarDia } = useStore();

  const m = useMemo(() => {
    const entregados = pedidos.filter((p) => p.estado === "entregado");
    const ingresos = entregados.reduce((s, p) => s + totalPedido(p), 0);
    const costos = entregados.reduce((s, p) => s + costoPedido(p), 0);
    const pendientes = pedidos.filter((p) => p.estado === "pendiente");

    const ranking = new Map<string, { nombre: string; unidades: number; ingresos: number }>();
    entregados.forEach((p) =>
      p.items.forEach((i) => {
        const prev = ranking.get(i.productoId) ?? { nombre: i.nombre, unidades: 0, ingresos: 0 };
        ranking.set(i.productoId, {
          nombre: i.nombre,
          unidades: prev.unidades + i.cantidad,
          ingresos: prev.ingresos + i.precio * i.cantidad,
        });
      }),
    );

    return {
      ingresos,
      costos,
      utilidad: ingresos - costos,
      pendientes,
      valorPendiente: pendientes.reduce((s, p) => s + totalPedido(p), 0),
      top: [...ranking.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 5),
    };
  }, [pedidos]);

  const maxUnidades = m.top[0]?.unidades ?? 0;
  const margenPct = m.ingresos > 0 ? (m.utilidad / m.ingresos) * 100 : 0;

  if (!hidratado) {
    return (
      <AdminGuard>
        <AppShell>
          <div className="h-40 animate-pulse rounded-3xl bg-secondary/60" />
        </AppShell>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AppShell>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Panel financiero</h1>
            <p className="text-sm text-muted-foreground">
              Resultados reales según pedidos entregados
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarCheck className="h-4 w-4" /> Cerrar día
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cerrar el día actual?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se guardarán {money(m.ingresos)} en ventas y {money(m.utilidad)} de utilidad en tu
                  historial. Los pedidos entregados se archivan y las métricas del día vuelven a
                  cero. Los pedidos pendientes se mantienen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const cierre = cerrarDia();
                    if (cierre) {
                      toast.success("Día cerrado", {
                        description: `${money(cierre.ingresos)} en ventas guardados en el historial.`,
                      });
                    } else {
                      toast.error("No hay pedidos entregados para cerrar el día.");
                    }
                  }}
                >
                  Cerrar día
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric icon={Coins} label="Ingresos totales" value={money(m.ingresos)} />
          <Metric icon={Receipt} label="Costos totales" value={money(m.costos)} />
          <Metric
            icon={Wallet}
            label="Utilidad neta"
            value={money(m.utilidad)}
            hint={`${margenPct.toFixed(0)}% de margen`}
            destacado
          />
          <Metric
            icon={Clock}
            label="Pedidos pendientes"
            value={String(m.pendientes.length)}
            hint={`${money(m.valorPendiente)} por cobrar`}
          />
        </div>

        {productos.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Cookie}
              title="Comienza registrando tus galletas"
              description="Agrega productos con su costo y precio para que el panel calcule tus utilidades automáticamente."
              action={
                <Button asChild>
                  <Link to="/productos">
                    <Plus className="h-4 w-4" /> Crear producto
                  </Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <TrendingUp className="h-4 w-4 text-primary" /> Más vendidas
                </h2>
                {m.top.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Aún no hay pedidos entregados. Marca un pedido como entregado para ver el
                    ranking.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {m.top.map((t) => (
                      <li key={t.nombre}>
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{t.nombre}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {t.unidades} u. · {money(t.ingresos)}
                          </span>
                        </div>
                        <Progress
                          value={maxUnidades ? (t.unidades / maxUnidades) * 100 : 0}
                          className="mt-2 h-2"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h2 className="text-base font-semibold">Inventario actual</h2>
                <ul className="mt-4 space-y-3">
                  {productos.slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{p.nombre}</span>
                      <span
                        className={
                          p.stock <= 0
                            ? "shrink-0 font-semibold text-destructive"
                            : "shrink-0 font-semibold"
                        }
                      >
                        {p.stock} u.
                      </span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-5 w-full">
                  <Link to="/productos">Ver inventario completo</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" /> Historial de días cerrados
          </h2>
          <div className="mt-3">
            <HistorialCierres cierres={cierres} />
          </div>
        </section>
      </AppShell>
    </AdminGuard>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  destacado,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  hint?: string;
  destacado?: boolean;
}) {
  return (
    <Card className={destacado ? "border-accent/60 bg-accent/15" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p className="mt-2 truncate text-xl font-semibold">{value}</p>
        {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
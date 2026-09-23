import { useState } from "react";
import { CalendarRange, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { money, useStore, type Cierre, type ItemPedido } from "@/lib/store";

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const fechaInput = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toISOString().slice(0, 10);
};

type LineaDetalle = {
  productoId: string;
  nombre: string;
  precio: number;
  costo: number;
  cantidad: string;
};

type FormCierre = {
  fecha: string;
  pedidos: string;
  detalle: LineaDetalle[] | null;
  ingresos: string;
  costos: string;
  unidades: string;
};

export function HistorialCierres({ cierres }: { cierres: Cierre[] }) {
  const { actualizarCierre, eliminarCierre } = useStore();
  const [editando, setEditando] = useState<Cierre | null>(null);
  const [form, setForm] = useState<FormCierre>({
    fecha: "",
    pedidos: "",
    detalle: null,
    ingresos: "",
    costos: "",
    unidades: "",
  });
  const [error, setError] = useState("");

  const abrirEditar = (c: Cierre) => {
    setEditando(c);
    setForm({
      fecha: fechaInput(c.fecha),
      pedidos: String(c.pedidos),
      detalle: c.detalle
        ? c.detalle.map((i) => ({
            productoId: i.productoId,
            nombre: i.nombre,
            precio: i.precio,
            costo: i.costo,
            cantidad: String(i.cantidad),
          }))
        : null,
      ingresos: String(c.ingresos),
      costos: String(c.costos),
      unidades: String(c.unidades),
    });
    setError("");
  };

  // Vista previa en vivo: se recalcula al cambiar cualquier cantidad
  const previa = form.detalle
    ? form.detalle.reduce(
        (acc, l) => {
          const cant = Number(l.cantidad);
          if (Number.isFinite(cant) && cant >= 0) {
            acc.ingresos += l.precio * cant;
            acc.costos += l.costo * cant;
            acc.unidades += cant;
          }
          return acc;
        },
        { ingresos: 0, costos: 0, unidades: 0 },
      )
    : null;

  const guardar = () => {
    if (!editando) return;
    if (!form.fecha) {
      setError("Selecciona la fecha del cierre");
      return;
    }
    const pedidos = Number(form.pedidos);
    if (!Number.isFinite(pedidos) || pedidos < 0) {
      setError("El número de pedidos debe ser 0 o mayor");
      return;
    }

    let ingresos: number;
    let costos: number;
    let unidades: number;
    let detalle: ItemPedido[] | undefined;

    if (form.detalle) {
      const lineas: ItemPedido[] = [];
      for (const l of form.detalle) {
        const cant = Number(l.cantidad);
        if (!Number.isFinite(cant) || !Number.isInteger(cant) || cant < 0) {
          setError(`La cantidad de "${l.nombre}" debe ser un entero 0 o mayor`);
          return;
        }
        lineas.push({
          productoId: l.productoId,
          nombre: l.nombre,
          precio: l.precio,
          costo: l.costo,
          cantidad: cant,
        });
      }
      detalle = lineas;
      ingresos = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
      costos = lineas.reduce((s, l) => s + l.costo * l.cantidad, 0);
      unidades = lineas.reduce((s, l) => s + l.cantidad, 0);
    } else {
      ingresos = Number(form.ingresos);
      costos = Number(form.costos);
      unidades = Number(form.unidades);
      if ([ingresos, costos, unidades].some((n) => !Number.isFinite(n) || n < 0)) {
        setError("Ingresa valores válidos (0 o mayores)");
        return;
      }
    }

    actualizarCierre(editando.id, {
      fecha: new Date(`${form.fecha}T12:00:00`).toISOString(),
      ingresos,
      costos,
      unidades,
      pedidos,
      utilidad: ingresos - costos,
      detalle,
    });
    toast.success("Cierre actualizado");
    setEditando(null);
  };

  if (cierres.length === 0) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="Aún no cierras ningún día"
        description="Cuando cierres tu primer día verás aquí la evolución de tus ventas y utilidades."
      />
    );
  }

  const data = cierres.slice(-14).map((c) => ({
    fecha: fechaCorta(c.fecha),
    ventas: c.ingresos,
    costos: c.costos,
    utilidad: c.utilidad,
    pedidos: c.pedidos,
  }));

  const totales = cierres.reduce(
    (acc, c) => ({
      ingresos: acc.ingresos + c.ingresos,
      utilidad: acc.utilidad + c.utilidad,
      pedidos: acc.pedidos + c.pedidos,
    }),
    { ingresos: 0, utilidad: 0, pedidos: 0 },
  );

  const ejeStyle = { fontSize: 11, fill: "var(--muted-foreground)" };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Evolución de ventas</h3>
          <p className="text-xs text-muted-foreground">Ingresos por día cerrado</p>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: -14, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--caramel)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--caramel)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="fecha" tick={ejeStyle} tickLine={false} axisLine={false} />
                <YAxis tick={ejeStyle} tickLine={false} axisLine={false} width={58} />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="var(--caramel)"
                  strokeWidth={2}
                  fill="url(#gradVentas)"
                  name="Ventas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Utilidad por día</h3>
          <p className="text-xs text-muted-foreground">
            Total histórico: {money(totales.utilidad)} en {totales.pedidos} pedidos
          </p>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: -14, right: 6, top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="fecha" tick={ejeStyle} tickLine={false} axisLine={false} />
                <YAxis tick={ejeStyle} tickLine={false} axisLine={false} width={58} />
                <Tooltip
                  cursor={{ fill: "var(--secondary)", opacity: 0.5 }}
                  formatter={(v: number) => money(v)}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Bar dataKey="utilidad" fill="var(--primary)" radius={[6, 6, 0, 0]} name="Utilidad" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Detalle de cierres</h3>
          <ul className="mt-3 divide-y divide-border/70 text-sm">
            {[...cierres].reverse().map((c) => (
              <li key={c.id} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{fechaLarga(c.fecha)}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {c.pedidos} pedidos · {c.unidades} u. · Ventas {money(c.ingresos)} · Utilidad{" "}
                      <span className="font-semibold text-foreground">{money(c.utilidad)}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Editar cierre"
                      onClick={() => abrirEditar(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          aria-label="Eliminar cierre"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar este cierre?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminará el registro del {fechaLarga(c.fecha)} con ventas de{" "}
                            {money(c.ingresos)}. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              eliminarCierre(c.id);
                              toast.success("Cierre eliminado");
                            }}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </span>
                </div>
                {c.detalle && c.detalle.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5 pl-1 text-xs text-muted-foreground">
                    {c.detalle.map((i) => (
                      <li key={i.productoId} className="flex justify-between gap-3">
                        <span className="truncate">
                          {i.cantidad} × {i.nombre}
                        </span>
                        <span className="shrink-0">{money(i.precio * i.cantidad)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Ventas acumuladas: {money(totales.ingresos)}
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cierre</DialogTitle>
            <DialogDescription>
              Cambia la fecha y las cantidades por producto; ventas, costos y utilidad se
              recalculan solos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cierre-fecha">Fecha</Label>
                <Input
                  id="cierre-fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cierre-pedidos">Pedidos</Label>
                <Input
                  id="cierre-pedidos"
                  type="number"
                  min={0}
                  value={form.pedidos}
                  onChange={(e) => setForm({ ...form, pedidos: e.target.value })}
                />
              </div>
            </div>

            {form.detalle ? (
              <div className="space-y-2">
                <Label>Productos vendidos</Label>
                {form.detalle.map((l, idx) => (
                  <div
                    key={l.productoId}
                    className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2 rounded-xl border border-border bg-card p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {money(l.precio)} c/u · costo {money(l.costo)}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      aria-label={`Cantidad de ${l.nombre}`}
                      value={l.cantidad}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          detalle: form.detalle!.map((x, i) =>
                            i === idx ? { ...x, cantidad: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
                {previa ? (
                  <div className="rounded-xl bg-secondary/60 p-3 text-xs">
                    <p>
                      Ventas: <span className="font-semibold">{money(previa.ingresos)}</span> ·
                      Costos: <span className="font-semibold">{money(previa.costos)}</span> ·
                      Unidades: <span className="font-semibold">{previa.unidades}</span>
                    </p>
                    <p className="mt-1">
                      Utilidad:{" "}
                      <span className="font-semibold">
                        {money(previa.ingresos - previa.costos)}
                      </span>
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cierre-ingresos">Ventas ($)</Label>
                  <Input
                    id="cierre-ingresos"
                    type="number"
                    min={0}
                    value={form.ingresos}
                    onChange={(e) => setForm({ ...form, ingresos: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cierre-costos">Costos ($)</Label>
                  <Input
                    id="cierre-costos"
                    type="number"
                    min={0}
                    value={form.costos}
                    onChange={(e) => setForm({ ...form, costos: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cierre-unidades">Unidades</Label>
                  <Input
                    id="cierre-unidades"
                    type="number"
                    min={0}
                    value={form.unidades}
                    onChange={(e) => setForm({ ...form, unidades: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

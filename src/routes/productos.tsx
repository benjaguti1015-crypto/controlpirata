import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChefHat, Cookie, Flame, Pencil, Plus, Trash2, TriangleAlert, Wheat } from "lucide-react";
import { toast } from "sonner";

import { AlertaStockWhatsApp } from "@/components/AlertaStockWhatsApp";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
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
import { Badge } from "@/components/ui/badge";
import { useStore, money, type Producto, type RecetaItem } from "@/lib/store";

export const Route = createFileRoute("/productos")({
  head: () => ({
    meta: [
      { title: "Inventario de galletas | Dulces del Rey Pirata" },
      {
        name: "description",
        content:
          "Registra galletas artesanales con costo, precio y stock, y calcula el margen de utilidad por unidad en tiempo real.",
      },
      { property: "og:title", content: "Inventario de galletas | Dulces del Rey Pirata" },
      {
        property: "og:description",
        content: "Control de stock y márgenes de utilidad para tu emprendimiento de galletas.",
      },
    ],
  }),
  component: ProductosPage,
});

const UMBRAL_STOCK_BAJO = 5;

type FormState = { nombre: string; costo: string; precio: string; stock: string };
const vacio: FormState = { nombre: "", costo: "", precio: "", stock: "" };

function ProductosPage() {
  const {
    productos,
    insumos,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    guardarReceta,
    hornearLote,
  } = useStore();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [form, setForm] = useState<FormState>(vacio);
  const [errores, setErrores] = useState<Partial<Record<keyof FormState, string>>>({});

  const [hornearAbierto, setHornearAbierto] = useState(false);
  const [hornearProducto, setHornearProducto] = useState<Producto | null>(null);
  const [hornearCantidad, setHornearCantidad] = useState("");
  const [hornearError, setHornearError] = useState<string | null>(null);

  const [recetaAbierta, setRecetaAbierta] = useState(false);
  const [recetaProducto, setRecetaProducto] = useState<Producto | null>(null);
  const [rendimiento, setRendimiento] = useState("10");
  const [recetaLineas, setRecetaLineas] = useState<{ insumoId: string; cantidad: string }[]>([]);
  const [recetaError, setRecetaError] = useState<string | null>(null);

  const nombreInsumo = (id: string) => insumos.find((i) => i.id === id);

  const abrirReceta = (p: Producto) => {
    setRecetaProducto(p);
    setRendimiento(String(p.receta?.rendimiento ?? 10));
    setRecetaLineas(
      p.receta?.items.map((it) => ({ insumoId: it.insumoId, cantidad: String(it.cantidad) })) ?? [
        { insumoId: "", cantidad: "" },
      ],
    );
    setRecetaError(null);
    setRecetaAbierta(true);
  };

  const guardarRecetaForm = () => {
    if (!recetaProducto) return;
    const rend = Number(rendimiento);
    if (!Number.isFinite(rend) || rend <= 0) {
      setRecetaError("El rendimiento debe ser mayor a 0");
      return;
    }
    const items: RecetaItem[] = [];
    for (const l of recetaLineas) {
      if (!l.insumoId) continue;
      const cantidad = Number(l.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        setRecetaError("Cada insumo debe tener una cantidad mayor a 0");
        return;
      }
      if (items.some((i) => i.insumoId === l.insumoId)) {
        setRecetaError("Hay insumos repetidos en la receta");
        return;
      }
      items.push({ insumoId: l.insumoId, cantidad });
    }
    guardarReceta(recetaProducto.id, items.length ? { rendimiento: rend, items } : undefined);
    toast.success(items.length ? "Receta guardada" : "Receta eliminada");
    setRecetaAbierta(false);
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio);
    setErrores({});
    setAbierto(true);
  };

  const abrirEditar = (p: Producto) => {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      costo: String(p.costo),
      precio: String(p.precio),
      stock: String(p.stock),
    });
    setErrores({});
    setAbierto(true);
  };

  const abrirHornear = (p: Producto) => {
    setHornearProducto(p);
    setHornearCantidad("");
    setHornearError(null);
    setHornearAbierto(true);
  };

  const costoNum = Number(form.costo);
  const precioNum = Number(form.precio);
  const margenPreview =
    Number.isFinite(costoNum) && Number.isFinite(precioNum) ? precioNum - costoNum : 0;

  const guardar = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    const costo = Number(form.costo);
    const precio = Number(form.precio);
    const stock = Number(form.stock);
    if (form.costo === "" || !Number.isFinite(costo) || costo < 0)
      e.costo = "Ingresa un costo válido (0 o mayor)";
    if (form.precio === "" || !Number.isFinite(precio) || precio < 0)
      e.precio = "Ingresa un precio válido (0 o mayor)";
    if (form.stock === "" || !Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock))
      e.stock = "Ingresa un stock entero (0 o mayor)";
    setErrores(e);
    if (Object.keys(e).length) return;

    const payload = { nombre: form.nombre.trim(), costo, precio, stock };
    if (editando) {
      actualizarProducto(editando.id, payload);
      toast.success("Producto actualizado");
    } else {
      agregarProducto(payload);
      toast.success("Producto registrado");
    }
    setAbierto(false);
  };

  const guardarHornear = () => {
    if (!hornearProducto) return;
    const cantidad = Number(hornearCantidad);
    if (
      hornearCantidad === "" ||
      !Number.isFinite(cantidad) ||
      !Number.isInteger(cantidad) ||
      cantidad <= 0
    ) {
      setHornearError("Ingresa una cantidad entera mayor a 0");
      return;
    }

    const { faltantes } = hornearLote(hornearProducto.id, cantidad);
    toast.success(`Se sumaron ${cantidad} unidades de ${hornearProducto.nombre}`);
    if (faltantes.length) {
      toast.warning(`Insumos en negativo: ${faltantes.join(", ")}`);
    }
    setHornearAbierto(false);
  };

  return (
    <AppShell>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">Productos e inventario</h1>
          <p className="text-sm text-muted-foreground">Costos, precios y stock disponible</p>
        </div>
        <Button onClick={abrirNuevo} className="shrink-0">
          <Plus className="h-4 w-4" /> Nueva
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {productos.length === 0 ? (
          <EmptyState
            icon={Cookie}
            title="Aún no hay galletas registradas"
            description="Agrega tu primera galleta con su costo de producción, precio de venta y stock para empezar a calcular utilidades."
            action={
              <Button onClick={abrirNuevo}>
                <Plus className="h-4 w-4" /> Registrar galleta
              </Button>
            }
          />
        ) : (
          productos.map((p) => {
            const margen = p.precio - p.costo;
            const pct = p.costo > 0 ? (margen / p.costo) * 100 : p.precio > 0 ? 100 : 0;
            const stockBajo = p.stock > 0 && p.stock <= UMBRAL_STOCK_BAJO;
            const sinStock = p.stock <= 0;
            return (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{p.nombre}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Costo {money(p.costo)}</span>
                        <span>·</span>
                        <span>Venta {money(p.precio)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(p)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          eliminarProducto(p.id);
                          toast.success("Producto eliminado");
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-secondary/70 px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Margen
                      </p>
                      <p className="text-sm font-semibold">{money(margen)}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/70 px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Ganancia
                      </p>
                      <p className="text-sm font-semibold">{pct.toFixed(0)}%</p>
                    </div>
                    <div className="rounded-xl bg-secondary/70 px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Stock
                      </p>
                      <p className="text-sm font-semibold">{p.stock} u.</p>
                    </div>
                  </div>

                  {p.receta && p.receta.items.length ? (
                    <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Wheat className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0">
                        Por {p.receta.rendimiento} u.:{" "}
                        {p.receta.items
                          .map((it) => {
                            const ins = nombreInsumo(it.insumoId);
                            return ins ? `${it.cantidad} ${ins.unidad} ${ins.nombre}` : null;
                          })
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </p>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => abrirReceta(p)}>
                      <ChefHat className="h-4 w-4" /> Receta
                    </Button>
                    <Button variant="outline" onClick={() => abrirHornear(p)}>
                      <Flame className="h-4 w-4 text-amber-600" /> Hornear
                    </Button>
                  </div>

                  {sinStock ? (
                    <div className="mt-3 space-y-2">
                      <Badge variant="destructive">
                        <TriangleAlert className="h-3 w-3" /> Sin stock
                      </Badge>
                      <AlertaStockWhatsApp
                        tipo="producto"
                        nombre={p.nombre}
                        estado="agotado"
                        detalle="0 unidades"
                      />
                    </div>
                  ) : stockBajo ? (
                    <div className="mt-3 space-y-2">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        <TriangleAlert className="h-3 w-3" /> Stock bajo
                      </Badge>
                      <AlertaStockWhatsApp
                        tipo="producto"
                        nombre={p.nombre}
                        estado="crítico"
                        detalle={`${p.stock} unidades (mínimo ${UMBRAL_STOCK_BAJO})`}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>
              El margen se calcula automáticamente con el costo y el precio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Galleta de chocolate"
              />
              {errores.nombre ? (
                <p className="text-xs text-destructive">{errores.nombre}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="costo">Costo unitario</Label>
                <Input
                  id="costo"
                  type="number"
                  min={0}
                  step="any"
                  value={form.costo}
                  onChange={(e) => setForm({ ...form, costo: e.target.value })}
                />
                {errores.costo ? (
                  <p className="text-xs text-destructive">{errores.costo}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="precio">Precio venta</Label>
                <Input
                  id="precio"
                  type="number"
                  min={0}
                  step="any"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                />
                {errores.precio ? (
                  <p className="text-xs text-destructive">{errores.precio}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stock">Stock actual (unidades)</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                step={1}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
              {errores.stock ? <p className="text-xs text-destructive">{errores.stock}</p> : null}
            </div>

            <div className="rounded-xl bg-secondary/70 px-3 py-2 text-sm">
              Margen estimado:{" "}
              <span className="font-semibold">{money(margenPreview)}</span> por unidad
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hornearAbierto} onOpenChange={setHornearAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hornear lote</DialogTitle>
            <DialogDescription>
              Suma unidades recién horneadas al stock de{" "}
              <span className="font-semibold text-foreground">{hornearProducto?.nombre}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="hornear-cantidad">Unidades horneadas</Label>
              <Input
                id="hornear-cantidad"
                type="number"
                min={1}
                step={1}
                value={hornearCantidad}
                onChange={(e) => {
                  setHornearCantidad(e.target.value);
                  setHornearError(null);
                }}
                placeholder="Ej: 24"
                autoFocus
              />
              {hornearError ? (
                <p className="text-xs text-destructive">{hornearError}</p>
              ) : null}
            </div>

            {hornearProducto?.receta && hornearProducto.receta.items.length ? (
              <div className="rounded-xl bg-secondary/70 px-3 py-2 text-xs">
                <p className="font-semibold text-foreground">Insumos que se descontarán</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {hornearProducto.receta.items.map((it) => {
                    const ins = nombreInsumo(it.insumoId);
                    if (!ins) return null;
                    const cant = Number(hornearCantidad);
                    const consumo = Number.isFinite(cant)
                      ? Math.round(
                          ((it.cantidad * cant) / hornearProducto.receta!.rendimiento) * 100,
                        ) / 100
                      : 0;
                    return (
                      <li key={it.insumoId}>
                        {ins.nombre}: {consumo} {ins.unidad}{" "}
                        <span className={consumo > ins.stock ? "text-destructive" : ""}>
                          (quedan {Math.round((ins.stock - consumo) * 100) / 100} {ins.unidad})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="rounded-xl bg-secondary/70 px-3 py-2 text-sm">
              Stock actual:{" "}
              <span className="font-semibold">{hornearProducto?.stock ?? 0} u.</span>
              {" · "}Nuevo stock:{" "}
              <span className="font-semibold">
                {(hornearProducto?.stock ?? 0) + (Number.isFinite(Number(hornearCantidad))
                  ? Number(hornearCantidad)
                  : 0)} u.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHornearAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarHornear}>Sumar al inventario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={recetaAbierta} onOpenChange={setRecetaAbierta}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receta de {recetaProducto?.nombre}</DialogTitle>
            <DialogDescription>
              Define cuántos insumos se consumen para producir cierta cantidad de unidades.
            </DialogDescription>
          </DialogHeader>

          {insumos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Primero registra insumos en la sección Insumos para poder crear recetas.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rendimiento">Rendimiento (unidades por lote)</Label>
                <Input
                  id="rendimiento"
                  type="number"
                  min={1}
                  step={1}
                  value={rendimiento}
                  onChange={(e) => {
                    setRendimiento(e.target.value);
                    setRecetaError(null);
                  }}
                />
              </div>

              <div className="space-y-2">
                {recetaLineas.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-[minmax(0,1fr)_88px_auto] gap-2">
                    <select
                      className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm"
                      value={l.insumoId}
                      onChange={(e) => {
                        const next = [...recetaLineas];
                        next[idx] = { ...l, insumoId: e.target.value };
                        setRecetaLineas(next);
                        setRecetaError(null);
                      }}
                    >
                      <option value="">Insumo…</option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nombre} ({i.unidad})
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="Cant."
                      value={l.cantidad}
                      onChange={(e) => {
                        const next = [...recetaLineas];
                        next[idx] = { ...l, cantidad: e.target.value };
                        setRecetaLineas(next);
                        setRecetaError(null);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRecetaLineas(recetaLineas.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Quitar insumo</span>
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setRecetaLineas([...recetaLineas, { insumoId: "", cantidad: "" }])}
                >
                  <Plus className="h-4 w-4" /> Agregar insumo
                </Button>
              </div>

              {recetaError ? <p className="text-xs text-destructive">{recetaError}</p> : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecetaAbierta(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarRecetaForm} disabled={insumos.length === 0}>
              Guardar receta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

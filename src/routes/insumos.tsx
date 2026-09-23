import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, TriangleAlert, Wheat } from "lucide-react";
import { toast } from "sonner";

import { AlertaStockWhatsApp } from "@/components/AlertaStockWhatsApp";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
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
import { useStore, type Insumo } from "@/lib/store";

export const Route = createFileRoute("/insumos")({
  head: () => ({
    meta: [
      { title: "Insumos y materias primas | Dulces del Rey Pirata" },
      {
        name: "description",
        content:
          "Controla el stock de harina, azúcar, mantequilla y empaques con alertas de stock bajo y descuento automático al hornear.",
      },
      { property: "og:title", content: "Insumos y materias primas | Dulces del Rey Pirata" },
      {
        property: "og:description",
        content: "Inventario de materias primas y empaques conectado a las recetas de tus galletas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsumosPage,
});

type FormState = { nombre: string; stock: string; unidad: string; minimo: string };
const vacio: FormState = { nombre: "", stock: "", unidad: "g", minimo: "" };

function InsumosPage() {
  const { insumos, agregarInsumo, actualizarInsumo, eliminarInsumo } = useStore();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [form, setForm] = useState<FormState>(vacio);
  const [errores, setErrores] = useState<Partial<Record<keyof FormState, string>>>({});

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio);
    setErrores({});
    setAbierto(true);
  };

  const abrirEditar = (i: Insumo) => {
    setEditando(i);
    setForm({
      nombre: i.nombre,
      stock: String(i.stock),
      // Si por alguna razón antigua tuviera otra unidad, por seguridad la mapeamos o dejamos 'g'
      unidad: i.unidad === "u" ? "u" : "g",
      minimo: String(i.minimo),
    });
    setErrores({});
    setAbierto(true);
  };

  const guardar = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (form.unidad !== "g" && form.unidad !== "u") e.unidad = "Selecciona una unidad válida";
    
    const stock = Number(form.stock);
    const minimo = Number(form.minimo);
    
    if (form.stock === "" || !Number.isFinite(stock))
      e.stock = "Ingresa un stock válido (puede ser negativo)";
    if (form.minimo === "" || !Number.isFinite(minimo) || minimo < 0)
      e.minimo = "Ingresa un mínimo válido (0 o mayor)";
    
    setErrores(e);
    if (Object.keys(e).length) return;

    const payload = { nombre: form.nombre.trim(), stock, unidad: form.unidad, minimo };
    if (editando) {
      actualizarInsumo(editando.id, payload);
      toast.success("Insumo actualizado");
    } else {
      agregarInsumo(payload);
      toast.success("Insumo registrado");
    }
    setAbierto(false);
  };

  return (
    <AppShell>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">Insumos y empaques</h1>
          <p className="text-sm text-muted-foreground">Materias primas disponibles en tu cocina</p>
        </div>
        <Button onClick={abrirNuevo} className="shrink-0">
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {insumos.length === 0 ? (
          <EmptyState
            icon={Wheat}
            title="Aún no hay insumos registrados"
            description="Registra harina, azúcar, mantequilla o bolsas de celofán para que se descuenten automáticamente al hornear."
            action={
              <Button onClick={abrirNuevo}>
                <Plus className="h-4 w-4" /> Registrar insumo
              </Button>
            }
          />
        ) : (
          insumos.map((i) => {
            const sinStock = i.stock <= 0;
            const bajo = !sinStock && i.stock <= i.minimo;
            return (
              <Card key={i.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{i.nombre}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mínimo sugerido: {i.minimo} {i.unidad}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(i)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          eliminarInsumo(i.id);
                          toast.success("Insumo eliminado");
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-secondary/70 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Stock disponible
                    </p>
                    <p className="text-sm font-semibold">
                      {i.stock} {i.unidad}
                    </p>
                  </div>

                  {sinStock ? (
                    <div className="mt-3 space-y-2">
                      <Badge variant="destructive">
                        <TriangleAlert className="h-3 w-3" /> Sin stock
                      </Badge>
                      <AlertaStockWhatsApp
                        tipo="insumo"
                        nombre={i.nombre}
                        estado="agotado"
                        detalle={`${i.stock} ${i.unidad}`}
                      />
                    </div>
                  ) : bajo ? (
                    <div className="mt-3 space-y-2">
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-800 hover:bg-amber-100"
                      >
                        <TriangleAlert className="h-3 w-3" /> Stock bajo
                      </Badge>
                      <AlertaStockWhatsApp
                        tipo="insumo"
                        nombre={i.nombre}
                        estado="crítico"
                        detalle={`${i.stock} ${i.unidad} (mínimo ${i.minimo} ${i.unidad})`}
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
            <DialogTitle>{editando ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
            <DialogDescription>
              Define la unidad de medida que usarás en las recetas (Gramos o Unidades).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="insumo-nombre">Nombre</Label>
              <Input
                id="insumo-nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Azúcar o Bolsas"
              />
              {errores.nombre ? <p className="text-xs text-destructive">{errores.nombre}</p> : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="insumo-stock">Stock actual</Label>
                <Input
                  id="insumo-stock"
                  type="number"
                  step="any"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
                {errores.stock ? <p className="text-xs text-destructive">{errores.stock}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="insumo-unidad">Unidad</Label>
                <select
                  id="insumo-unidad"
                  value={form.unidad}
                  onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="g">Gramos (g)</option>
                  <option value="u">Unidades (u)</option>
                </select>
                {errores.unidad ? (
                  <p className="text-xs text-destructive">{errores.unidad}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="insumo-minimo">Alerta de stock bajo (mínimo)</Label>
              <Input
                id="insumo-minimo"
                type="number"
                min={0}
                step="any"
                value={form.minimo}
                onChange={(e) => setForm({ ...form, minimo: e.target.value })}
                placeholder="Ej: 500"
              />
              {errores.minimo ? <p className="text-xs text-destructive">{errores.minimo}</p> : null}
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
    </AppShell>
  );
}
import { Link } from "@tanstack/react-router";
import {
  CloudOff,
  Cookie,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Package,
  ShoppingBag,
  Store,
  UserRound,
  Wheat,
} from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";

const nav = [
  { to: "/", label: "Panel", icon: LayoutDashboard },
  { to: "/productos", label: "Inventario", icon: Package },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/insumos", label: "Insumos", icon: Wheat },
  { to: "/millaray", label: "Millaray", icon: Store },
  { to: "/chico-alex", label: "Alex", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { cerrarSesion, estadoSync } = useStore();
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Cookie className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold leading-tight">
                Dulces del Rey Pirata
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Galletas artesanales
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {estadoSync === "guardando" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Guardando
              </span>
            )}
            {estadoSync === "error" && (
              <span
                className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive"
                role="alert"
              >
                <CloudOff className="h-3.5 w-3.5" /> Sin guardar
              </span>
            )}
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  activeOptions={{ exact: item.to === "/" }}
                  activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
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
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border/70 bg-background/95 backdrop-blur md:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{ className: "text-primary" }}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

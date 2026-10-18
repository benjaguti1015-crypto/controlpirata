import { Store, User, UserRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { money, type Canal, type DesgloseCanales as Desglose } from "@/lib/store";

export const CANALES: { canal: Canal; label: string; icon: typeof User }[] = [
  { canal: "directo", label: "Tú", icon: User },
  { canal: "millaray", label: "Millaray", icon: Store },
  { canal: "alex", label: "Alex", icon: UserRound },
];

export function DesgloseCanales({ desglose }: { desglose: Desglose }) {
  const total = CANALES.reduce((s, c) => s + desglose[c.canal].ingresos, 0);
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Ventas del día por punto de venta</h2>
          <span className="shrink-0 text-sm font-semibold">{money(total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">Entregadas y aún sin cerrar el día</p>
        <ul className="mt-4 space-y-4">
          {CANALES.map(({ canal, label, icon: Icon }) => {
            const d = desglose[canal];
            const pct = total > 0 ? (d.ingresos / total) * 100 : 0;
            return (
              <li key={canal}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    {label}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {d.unidades} u. ·{" "}
                    <span className="font-semibold text-foreground">{money(d.ingresos)}</span>
                    {total > 0 ? ` · ${Math.round(pct)}%` : ""}
                  </span>
                </div>
                <Progress value={pct} className="mt-2 h-2" />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

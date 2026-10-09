import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/lib/store";
import type { Dia } from "@/lib/metricas";

const etiqueta = (f: string) => `${f.slice(8)}/${f.slice(5, 7)}`;

export function VentasDiarias({ dias }: { dias: Dia[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-base font-semibold">Ventas de los últimos 30 días</h2>
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dias} margin={{ left: -14, right: 4, top: 6 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="fecha"
                tickFormatter={etiqueta}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                labelFormatter={(f: string) => etiqueta(f)}
                formatter={(v: number) => [money(v), "Ventas"]}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
              />
              <Bar dataKey="ventas" fill="var(--primary)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

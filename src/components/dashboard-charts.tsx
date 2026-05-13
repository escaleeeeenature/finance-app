"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { fmt } from "@/lib/utils";

const COLORS = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6"];

export function DashboardCharts({
  allocation,
  top5,
}: {
  allocation: { name: string; value: number }[];
  top5: [string, number][];
}) {
  const maxVal = top5.length > 0 ? top5[0][1] : 1;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Allocation donut */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Allocation d&apos;Actifs</CardTitle>
        </CardHeader>
        <CardContent>
          {allocation.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={allocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {allocation.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${fmt(Number(v))} CHF`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {allocation.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{item.name}</span>
                    <span className="text-xs font-medium tabular-nums text-slate-800">
                      {fmt(item.value)} CHF
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">Aucune donnée</p>
          )}
        </CardContent>
      </Card>

      {/* Top 5 dépenses — compact list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Top 5 Dépenses du Mois</CardTitle>
        </CardHeader>
        <CardContent>
          {top5.length > 0 ? (
            <div className="space-y-2.5">
              {top5.map(([name, value], i) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-300 w-4 shrink-0 tabular-nums">{i + 1}</span>
                      <span className="text-sm text-slate-700 truncate">{name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-800 tabular-nums shrink-0 ml-2">
                      {fmt(Math.round(value))} CHF
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden ml-6">
                    <div
                      className="h-full rounded-full bg-indigo-400 transition-all"
                      style={{ width: `${Math.min((value / maxVal) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">Aucune dépense ce mois-ci</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { fmt } from "@/lib/utils";

const COLORS = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6"];

export function DashboardCharts({
  allocation,
  top5,
}: {
  allocation: { name: string; value: number }[];
  top5: [string, number][];
}) {
  const top5Data = top5.map(([name, value]) => ({ name, value: Math.round(value) }));

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
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={allocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
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
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
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

      {/* Top 5 dépenses */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Top 5 Dépenses du Mois</CardTitle>
        </CardHeader>
        <CardContent>
          {top5Data.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={top5Data} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v) => [`${fmt(Number(v))} CHF`, ""]} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">Aucune dépense ce mois-ci</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

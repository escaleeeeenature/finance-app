"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type HistoryPoint = {
  date: string;      // "dd/mm/yyyy"
  patrimoine_net: number;
  cash: number;
  investi: number;
  epargne: number;
};

function parseFrDate(d: string): number {
  const [day, month, year] = d.split("/");
  return new Date(+year, +month - 1, +day).getTime();
}

function fmtK(v: number) {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(0);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs space-y-1.5 min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="tabular-nums font-semibold text-slate-800">
            {Number(p.value).toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CHF
          </span>
        </div>
      ))}
    </div>
  );
};

export function NetWorthChart({ history }: { history: HistoryPoint[] }) {
  if (history.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Évolution du Patrimoine</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 py-10 text-center">
            Clique sur <strong>Snapshot</strong> pour enregistrer ton premier point.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort chronologically
  const sorted = [...history].sort((a, b) => parseFrDate(a.date) - parseFrDate(b.date));

  // Format date for X axis (show dd/mm, or just month if many points)
  const showYear = sorted.length > 1 &&
    sorted[0].date.split("/")[2] !== sorted[sorted.length - 1].date.split("/")[2];

  const data = sorted.map((p) => {
    const [d, m, y] = p.date.split("/");
    const label = showYear ? `${d}/${m}/${y.slice(2)}` : `${d}/${m}`;
    return { ...p, label };
  });

  // Delta vs first point
  const first = data[0].patrimoine_net;
  const last = data[data.length - 1].patrimoine_net;
  const delta = last - first;
  const deltaPct = first > 0 ? ((delta / first) * 100).toFixed(1) : null;

  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-slate-400";

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Évolution du Patrimoine
          </CardTitle>
          {data.length > 1 && (
            <div className={`flex items-center gap-1.5 text-sm font-semibold ${deltaColor}`}>
              <DeltaIcon size={15} />
              <span className="tabular-nums">
                {delta >= 0 ? "+" : ""}
                {delta.toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CHF
              </span>
              {deltaPct && (
                <span className="text-xs font-normal opacity-70">
                  ({delta >= 0 ? "+" : ""}{deltaPct}%)
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPatrimoine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradInvesti" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmtK}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            />
            <Area
              type="monotone"
              dataKey="patrimoine_net"
              name="Patrimoine Net"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#gradPatrimoine)"
              dot={data.length <= 12}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="cash"
              name="Cash"
              stroke="#0ea5e9"
              strokeWidth={1.5}
              fill="url(#gradCash)"
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Area
              type="monotone"
              dataKey="investi"
              name="Investi"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              fill="url(#gradInvesti)"
              dot={false}
              activeDot={{ r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

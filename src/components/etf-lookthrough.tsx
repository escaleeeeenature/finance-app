"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { Layers } from "lucide-react";
import type { ETFComposition } from "@/lib/etf-composition";

function fmtCHF(n: number) {
  return n.toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " CHF";
}

const CustomBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1">{d.nom}</p>
      <p className="text-slate-500">{d.poids.toFixed(1)}% du portefeuille</p>
      <p className="font-bold text-indigo-600 tabular-nums">{fmtCHF(d.valeurChf)}</p>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1">{d.nom}</p>
      <p className="text-slate-500">{d.poids.toFixed(1)}%</p>
      <p className="font-bold tabular-nums" style={{ color: d.couleur }}>{fmtCHF(d.valeurChf)}</p>
    </div>
  );
};

type Props = {
  compositions: {
    etf: ETFComposition;
    valeurChf: number;
  }[];
};

export function ETFLookthrough({ compositions }: Props) {
  if (compositions.length === 0) return null;

  // Aggregate top holdings across all ETFs
  const holdingsMap: Record<string, { nom: string; secteur: string; valeurChf: number; poids: number }> = {};
  const secteursMap: Record<string, { nom: string; couleur: string; valeurChf: number; poids: number }> = {};
  const totalPortfolio = compositions.reduce((s, c) => s + c.valeurChf, 0);

  for (const { etf, valeurChf } of compositions) {
    // Top 10
    for (const h of etf.top10) {
      const chf = (h.poids / 100) * valeurChf;
      if (!holdingsMap[h.ticker]) {
        holdingsMap[h.ticker] = { nom: h.nom, secteur: h.secteur, valeurChf: 0, poids: 0 };
      }
      holdingsMap[h.ticker].valeurChf += chf;
      holdingsMap[h.ticker].poids += (chf / totalPortfolio) * 100;
    }
    // Secteurs
    for (const s of etf.secteurs) {
      const chf = (s.poids / 100) * valeurChf;
      if (!secteursMap[s.nom]) {
        secteursMap[s.nom] = { nom: s.nom, couleur: s.couleur, valeurChf: 0, poids: 0 };
      }
      secteursMap[s.nom].valeurChf += chf;
      secteursMap[s.nom].poids += (chf / totalPortfolio) * 100;
    }
  }

  const top10Sorted = Object.entries(holdingsMap)
    .map(([ticker, d]) => ({ ticker, ...d }))
    .sort((a, b) => b.valeurChf - a.valeurChf)
    .slice(0, 10);

  const top10Total = top10Sorted.reduce((s, h) => s + h.poids, 0);
  const autresPoids = 100 - top10Total;
  const autresChf = (autresPoids / 100) * totalPortfolio;

  const secteursSorted = Object.values(secteursMap).sort((a, b) => b.valeurChf - a.valeurChf);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers size={16} className="text-indigo-400" />
        <h2 className="text-base font-semibold text-slate-800">Transparence du portefeuille</h2>
        <span className="text-xs text-slate-400 ml-1">Look-through</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 Holdings */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Top 10 positions réelles
            </CardTitle>
            <p className="text-xs text-slate-400">Ce que tu détiens réellement via tes ETFs</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {top10Sorted.map((h, i) => (
              <div key={h.ticker}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                    <span className="font-medium text-slate-800 text-sm">{h.ticker}</span>
                    <span className="text-xs text-slate-400 truncate">{h.nom}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-xs font-semibold text-slate-700 tabular-nums">{fmtCHF(h.valeurChf)}</span>
                    <span className="text-xs text-slate-400 ml-1">{h.poids.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${Math.min(h.poids / top10Sorted[0].poids * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {/* Autres */}
            <div className="pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">490 autres entreprises</span>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">{fmtCHF(autresChf)}</span>
                  <span className="text-xs text-slate-400 ml-1">{autresPoids.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secteurs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Exposition par secteur
            </CardTitle>
            <p className="text-xs text-slate-400">Répartition sectorielle réelle de ton portefeuille</p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-start">
              {/* Mini donut */}
              <div className="shrink-0">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={secteursSorted}
                      dataKey="poids"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={1}
                    >
                      {secteursSorted.map((s, i) => (
                        <Cell key={i} fill={s.couleur} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend list */}
              <div className="flex-1 space-y-1.5 min-w-0">
                {secteursSorted.map((s) => (
                  <div key={s.nom} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: s.couleur }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{s.nom}</span>
                    <span className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">
                      {s.poids.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Horizontal bar chart */}
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={secteursSorted.slice(0, 6)}
                  layout="vertical"
                  margin={{ left: 0, right: 60, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="nom"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="valeurChf" radius={[0, 4, 4, 0]}>
                    {secteursSorted.slice(0, 6).map((s, i) => (
                      <Cell key={i} fill={s.couleur} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Note de mise à jour */}
      <p className="text-xs text-slate-300 text-right">
        Composition S&P 500 — données Mai 2026 · Mise à jour recommandée 1×/trimestre
      </p>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF, toMoisStr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Landmark, Wallet, TrendingUp, PiggyBank, ArrowRight,
  TrendingDown, Activity, Percent, BanknoteIcon,
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";
import { NetWorthChart } from "@/components/net-worth-chart";
import { SnapshotButton } from "@/components/snapshot-button";
import { fetchPrices, fetchToChf } from "@/lib/prices";
import Link from "next/link";

async function getDashboardData() {
  const [accounts, transactions, budgets, invest, investRef, envelopes, historyRaw] = await Promise.all([
    readSheet("Comptes"),
    readSheet("Transactions"),
    readSheet("Budgets"),
    readSheet("Invest_Transactions"),
    readSheet("Invest_Referentiel"),
    readSheet("Enveloppes"),
    readSheet("Historique"),
  ]);

  const now = new Date();
  const currentMonth = toMoisStr(now);

  // ── Comptes ──────────────────────────────────────────────────────────────
  const activeAccounts = accounts.filter((a) => a["Statut"] === "Actif");
  const totalCash = activeAccounts.reduce((s, a) => s + parseNum(a["Solde_Initial"]), 0);
  const accountsData = activeAccounts.map((a) => ({
    nom: a["Nom"] || a["nom"] || "Compte",
    solde: parseNum(a["Solde_Initial"]),
    type: a["Type"] || "",
  }));

  // ── Open positions ────────────────────────────────────────────────────────
  const tickers = [...new Set(invest.map((r) => r["Symbole"]).filter(Boolean))];
  type Position = { quantite: number; cout: number; classe: string; currency: string };
  const openPos: Record<string, Position> = {};

  for (const ticker of tickers) {
    const rows = invest.filter((r) => r["Symbole"] === ticker);
    const boughtQte = rows.filter((r) => r["Type"] === "Achat").reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    const soldQte   = rows.filter((r) => r["Type"] === "Vente").reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    const qty = boughtQte - soldQte;
    if (qty <= 0) continue;
    const cout = rows
      .filter((r) => r["Type"] === "Achat")
      .reduce((s, r) => s + parseNum(r["Quantité"]) * parseNum(r["Prix_Unitaire"]) + parseNum(r["Frais"]), 0);
    const ref = investRef.find((r) => r["Symbole"] === ticker);
    openPos[ticker] = {
      quantite: qty,
      cout,
      classe: rows[0]["Classe"] || "Autre",
      currency: ref?.["Devise"] || "CHF",
    };
  }

  // ── Live prices ───────────────────────────────────────────────────────────
  const openTickers = Object.keys(openPos);
  const [liveResults, ...fxEntries] = await Promise.all([
    fetchPrices(openTickers).catch(() => ({} as Record<string, { price: number; currency: string; live: boolean }>)),
    ...([...new Set(Object.values(openPos).map((p) => p.currency))].map(async (c) => {
      const rate = await fetchToChf(c).catch(() => (c === "USD" ? 0.9 : 1));
      return [c, rate] as const;
    })),
  ]);
  const fxMap: Record<string, number> = { CHF: 1 };
  for (const [c, r] of fxEntries) fxMap[c as string] = r as number;

  // ── Performance par classe ────────────────────────────────────────────────
  const classePerf: Record<string, { cout: number; valeur: number; hasLive: boolean }> = {};
  let totalInvested = 0;
  const portfolioByClass: Record<string, number> = {};

  for (const [ticker, pos] of Object.entries(openPos)) {
    const priceData = liveResults[ticker];
    const fx = fxMap[pos.currency] ?? 1;
    const valeurChf = priceData ? priceData.price * pos.quantite * fx : pos.cout;

    if (!classePerf[pos.classe]) classePerf[pos.classe] = { cout: 0, valeur: 0, hasLive: false };
    classePerf[pos.classe].cout += pos.cout;
    classePerf[pos.classe].valeur += valeurChf;
    if (priceData) classePerf[pos.classe].hasLive = true;

    portfolioByClass[pos.classe] = (portfolioByClass[pos.classe] ?? 0) + pos.cout;
    totalInvested += pos.cout;
  }

  const totalInvestedLive = Object.values(classePerf).reduce((s, c) => s + c.valeur, 0);

  // ── Dépenses du mois ──────────────────────────────────────────────────────
  const depenses = transactions.filter((t) => {
    if (t["Type"] !== "Dépense") return false;
    try {
      const d = t["Date"].split("/");
      return toMoisStr(new Date(+d[2], +d[1] - 1, +d[0])) === currentMonth;
    } catch { return false; }
  });
  const byCategory: Record<string, number> = {};
  for (const t of depenses) {
    const cat = t["Catégorie"] || "Autre";
    byCategory[cat] = (byCategory[cat] ?? 0) + parseNum(t["Montant"]);
  }
  const top5 = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Budget santé ──────────────────────────────────────────────────────────
  const monthBudgets = budgets.filter((b) => b["Mois"] === currentMonth && b["Type"] === "Dépense");
  const budgetPrevu = monthBudgets.reduce((s, b) => s + parseNum(b["Montant_Prevu"]), 0);
  const depensesReelles = depenses.reduce((s, t) => s + parseNum(t["Montant"]), 0);
  const budgetPct = budgetPrevu > 0 ? Math.min(Math.round((depensesReelles / budgetPrevu) * 100), 100) : 0;

  // ── Taux d'épargne moyen 6 mois ──────────────────────────────────────────
  const savingsRates: number[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mois = toMoisStr(d);
    const rev = transactions
      .filter((t) => {
        if (t["Type"] !== "Revenu") return false;
        try { const p = t["Date"].split("/"); return toMoisStr(new Date(+p[2], +p[1] - 1, +p[0])) === mois; }
        catch { return false; }
      })
      .reduce((s, t) => s + parseNum(t["Montant"]), 0);
    const dep = transactions
      .filter((t) => {
        if (t["Type"] !== "Dépense") return false;
        try { const p = t["Date"].split("/"); return toMoisStr(new Date(+p[2], +p[1] - 1, +p[0])) === mois; }
        catch { return false; }
      })
      .reduce((s, t) => s + parseNum(t["Montant"]), 0);
    if (rev > 0) savingsRates.push((rev - dep) / rev);
  }
  const avgSavingsRate = savingsRates.length > 0
    ? savingsRates.reduce((s, r) => s + r, 0) / savingsRates.length
    : null;

  // ── Score de santé financière ─────────────────────────────────────────────
  // 1. Taux d'épargne (40%)
  const srScore = avgSavingsRate === null ? 50
    : avgSavingsRate >= 0.2 ? 100
    : avgSavingsRate >= 0.1 ? 70
    : avgSavingsRate >= 0  ? 40 : 0;

  // 2. Respect du budget (30%)
  const budgetRatio = budgetPrevu > 0 ? depensesReelles / budgetPrevu : null;
  const budgetScore = budgetRatio === null ? 50
    : budgetRatio <= 0.7 ? 100
    : budgetRatio <= 0.9 ? 80
    : budgetRatio <= 1.0 ? 60 : 20;

  // 3. Fonds d'urgence (30%) — cash vs dépenses mensuelles moyennes
  const avgMonthlyExp = savingsRates.length > 0
    ? transactions
        .filter((t) => {
          if (t["Type"] !== "Dépense") return false;
          try {
            const p = t["Date"].split("/");
            const d = new Date(+p[2], +p[1] - 1, +p[0]);
            const monthsAgo = (now.getTime() - d.getTime()) / (30.44 * 24 * 3600 * 1000);
            return monthsAgo <= 6;
          } catch { return false; }
        })
        .reduce((s, t) => s + parseNum(t["Montant"]), 0) / 6
    : 0;
  const monthsOfCash = avgMonthlyExp > 0 ? totalCash / avgMonthlyExp : 0;
  const urgenceScore = monthsOfCash >= 6 ? 100 : monthsOfCash >= 3 ? 70 : monthsOfCash >= 1 ? 40 : 0;

  const healthScore = Math.round(srScore * 0.4 + budgetScore * 0.3 + urgenceScore * 0.3);

  // ── Allocation & Enveloppes ───────────────────────────────────────────────
  const allocation = [
    { name: "Cash", value: Math.round(totalCash) },
    ...Object.entries(portfolioByClass).map(([name, value]) => ({ name, value: Math.round(value) })),
  ];

  const activeEnvelopes = envelopes.filter((e) => e["actif"] !== "false");
  const totalEpargne = activeEnvelopes.reduce((s, e) => s + parseNum(e["montant_actuel"]), 0);
  const nonAlloue = totalCash - totalEpargne;
  const envelopesSummary = activeEnvelopes
    .sort((a, b) => parseNum(b["montant_actuel"]) - parseNum(a["montant_actuel"]))
    .slice(0, 5)
    .map((e) => ({
      nom: e["nom"], montant: parseNum(e["montant_actuel"]),
      objectif: parseNum(e["objectif"]), couleur: e["couleur"] || "#6366f1",
    }));

  const history = historyRaw.map((r) => ({
    date: r["date"],
    patrimoine_net: parseNum(r["patrimoine_net"]),
    cash: parseNum(r["cash"]),
    investi: parseNum(r["investi"]),
    epargne: parseNum(r["epargne"]),
  }));

  return {
    totalCash, totalInvested, totalInvestedLive, currentMonth,
    accountsData, classePerf,
    top5, allocation,
    budgetPrevu, depensesReelles, budgetPct,
    totalEpargne, nonAlloue, envelopesSummary,
    history, avgSavingsRate, healthScore,
    monthsOfCash,
  };
}

function StatCard({
  title, value, sub, icon: Icon, iconColor, trend,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; iconColor: string; trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="flex-1 border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon size={16} className="text-white" />
          </div>
          {sub && (
            <Badge variant={trend === "up" ? "default" : trend === "down" ? "destructive" : "secondary"}
              className="text-xs font-medium">
              {sub}
            </Badge>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function HealthScore({ score, monthsOfCash }: { score: number; monthsOfCash: number }) {
  const level = score >= 80 ? { label: "Excellent", color: "text-emerald-600", ring: "stroke-emerald-500", bg: "bg-emerald-50" }
    : score >= 60 ? { label: "Bon", color: "text-sky-600", ring: "stroke-sky-500", bg: "bg-sky-50" }
    : score >= 40 ? { label: "À améliorer", color: "text-amber-600", ring: "stroke-amber-500", bg: "bg-amber-50" }
    : { label: "Insuffisant", color: "text-red-600", ring: "stroke-red-500", bg: "bg-red-50" };

  const circumference = 2 * Math.PI * 36;
  const dash = (score / 100) * circumference;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Activity size={14} className="text-indigo-400" />
          Santé Financière
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          {/* Radial gauge */}
          <div className="relative shrink-0">
            <svg width={90} height={90} className="-rotate-90">
              <circle cx={45} cy={45} r={36} fill="none" stroke="#f1f5f9" strokeWidth={8} />
              <circle
                cx={45} cy={45} r={36} fill="none" strokeWidth={8}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeLinecap="round"
                className={level.ring}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-bold tabular-nums ${level.color}`}>{score}</span>
              <span className="text-[10px] text-slate-400">/100</span>
            </div>
          </div>
          {/* Details */}
          <div className="space-y-2 flex-1">
            <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${level.bg} ${level.color}`}>
              {level.label}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                Réserve: <span className="font-semibold text-slate-700">{monthsOfCash.toFixed(1)} mois</span>
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {score >= 80 ? "Continue comme ça, ta gestion est au top." :
                  score >= 60 ? "Bonne trajectoire, quelques ajustements possibles." :
                  score >= 40 ? "Des améliorations importantes à envisager." :
                  "Attention, ta situation financière mérite un bilan."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceCard({
  classe, cout, valeur, hasLive,
}: {
  classe: string; cout: number; valeur: number; hasLive: boolean;
}) {
  const plusValue = valeur - cout;
  const pct = cout > 0 ? (plusValue / cout) * 100 : 0;
  const isPos = plusValue >= 0;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{classe}</span>
          {hasLive ? (
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">Live</span>
          ) : (
            <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-medium">Coût</span>
          )}
        </div>
        <p className="text-lg font-bold text-slate-900 tabular-nums">{fmtCHF(valeur)}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {isPos
            ? <TrendingUp size={12} className="text-emerald-500 shrink-0" />
            : <TrendingDown size={12} className="text-red-500 shrink-0" />
          }
          <span className={`text-xs font-semibold tabular-nums ${isPos ? "text-emerald-600" : "text-red-500"}`}>
            {isPos ? "+" : ""}{fmtCHF(plusValue)}
          </span>
          <span className={`text-xs tabular-nums ${isPos ? "text-emerald-500" : "text-red-400"}`}>
            ({isPos ? "+" : ""}{pct.toFixed(1)}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const savingsPct = data.avgSavingsRate !== null ? Math.round(data.avgSavingsRate * 100) : null;
  const savingsTrend = savingsPct === null ? "neutral" : savingsPct >= 20 ? "up" : savingsPct < 0 ? "down" : "neutral";
  const plusValueTotal = data.totalInvestedLive - data.totalInvested;
  const plusValuePct = data.totalInvested > 0 ? (plusValueTotal / data.totalInvested) * 100 : 0;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data.currentMonth}</p>
        </div>
        <SnapshotButton />
      </div>

      {/* KPIs row 1 */}
      <div className="flex gap-4">
        <StatCard
          title="Patrimoine Net"
          value={fmtCHF(data.totalCash + data.totalInvestedLive)}
          sub={plusValueTotal !== 0 ? `${plusValuePct >= 0 ? "+" : ""}${plusValuePct.toFixed(1)}%` : undefined}
          trend={plusValueTotal >= 0 ? "up" : "down"}
          icon={Landmark}
          iconColor="bg-indigo-500"
        />
        <StatCard
          title="Cash Disponible"
          value={fmtCHF(data.totalCash)}
          icon={Wallet}
          iconColor="bg-sky-500"
        />
        <StatCard
          title="Plus-value"
          value={`${plusValueTotal >= 0 ? "+" : ""}${fmtCHF(plusValueTotal)}`}
          icon={TrendingUp}
          iconColor={plusValueTotal >= 0 ? "bg-emerald-500" : "bg-red-500"}
        />
        <StatCard
          title="Épargne moy. 6m"
          value={savingsPct !== null ? `${savingsPct}%` : "—"}
          icon={Percent}
          iconColor={savingsPct !== null && savingsPct >= 20 ? "bg-violet-500" : savingsPct !== null && savingsPct >= 10 ? "bg-amber-500" : "bg-slate-400"}
          trend={savingsTrend}
        />
      </div>

      {/* Comptes courants */}
      {data.accountsData.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {data.accountsData.map((acc) => (
            <div key={acc.nom} className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm border-0">
              <BanknoteIcon size={14} className="text-sky-400 shrink-0" />
              <span className="text-xs text-slate-500">{acc.nom}</span>
              <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmtCHF(acc.solde)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Net Worth History */}
      <NetWorthChart history={data.history} />

      {/* Performance investissements + Health Score */}
      {Object.keys(data.classePerf).length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_1fr_280px] gap-4 items-start">
          {Object.entries(data.classePerf).map(([classe, perf]) => (
            <PerformanceCard key={classe} classe={classe} {...perf} />
          ))}
          {/* Pad empty columns if fewer than 3 classes */}
          {Object.keys(data.classePerf).length < 3 &&
            Array.from({ length: 3 - Object.keys(data.classePerf).length }).map((_, i) => (
              <div key={i} />
            ))
          }
          <HealthScore score={data.healthScore} monthsOfCash={data.monthsOfCash} />
        </div>
      )}
      {Object.keys(data.classePerf).length === 0 && (
        <div className="flex justify-end">
          <div className="w-[280px]">
            <HealthScore score={data.healthScore} monthsOfCash={data.monthsOfCash} />
          </div>
        </div>
      )}

      {/* Charts : allocation + top 5 compact */}
      <DashboardCharts allocation={data.allocation} top5={data.top5} />

      {/* Épargne fléchée */}
      {data.envelopesSummary.length > 0 && (
        <Link href="/enveloppes" className="block">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <PiggyBank size={15} className="text-indigo-400" />
                  Épargne fléchée
                </CardTitle>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="tabular-nums font-semibold">{fmtCHF(data.totalEpargne)}</span>
                  <span className="text-slate-300">·</span>
                  <span className={`text-xs font-medium ${data.nonAlloue < 0 ? "text-red-500" : "text-emerald-600"}`}>
                    Non alloué : {fmtCHF(data.nonAlloue)}
                  </span>
                  <ArrowRight size={14} className="text-slate-300" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-5 space-y-2.5">
              {data.envelopesSummary.map((env) => {
                const pct = env.objectif > 0
                  ? Math.min(Math.round((env.montant / env.objectif) * 100), 100) : 0;
                return (
                  <div key={env.nom} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: env.couleur }} />
                        {env.nom}
                      </span>
                      <span className="tabular-nums">
                        {fmtCHF(env.montant)}
                        {env.objectif > 0 && <span className="text-slate-300 ml-1">/ {fmtCHF(env.objectif)}</span>}
                      </span>
                    </div>
                    {env.objectif > 0 && (
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: env.couleur }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Budget santé */}
      {data.budgetPrevu > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Santé du Budget — {data.currentMonth}
              </CardTitle>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="tabular-nums">{fmtCHF(data.depensesReelles)}</span>
                <span className="text-slate-300">/</span>
                <span className="tabular-nums">{fmtCHF(data.budgetPrevu)}</span>
                <Badge variant={data.budgetPct <= 100 ? "default" : "destructive"} className="text-xs">
                  {data.budgetPct}%
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-5">
            <Progress value={data.budgetPct} className="h-2" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

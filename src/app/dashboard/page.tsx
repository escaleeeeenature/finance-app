import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF, toMoisStr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Landmark, Wallet, TrendingUp, PiggyBank, ArrowRight } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";
import { NetWorthChart } from "@/components/net-worth-chart";
import { SnapshotButton } from "@/components/snapshot-button";
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

  // Cash
  const activeAccounts = accounts.filter((a) => a["Statut"] === "Actif");
  const totalCash = activeAccounts.reduce((s, a) => s + parseNum(a["Solde_Initial"]), 0);

  // Investissements (sans appel Yahoo Finance côté serveur — on affiche le coût)
  let totalInvested = 0;
  const portfolioByClass: Record<string, number> = {};
  const tickers = [...new Set(invest.map((r) => r["Symbole"]))];
  for (const ticker of tickers) {
    const rows = invest.filter((r) => r["Symbole"] === ticker);
    const bought = rows.filter((r) => r["Type"] === "Achat").reduce((s, r) => s + parseNum(r["Quantité"]) * parseNum(r["Prix_Unitaire"]) + parseNum(r["Frais"]), 0);
    const soldQte = rows.filter((r) => r["Type"] === "Vente").reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    const boughtQte = rows.filter((r) => r["Type"] === "Achat").reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    if (boughtQte - soldQte <= 0) continue;
    const classe = rows[0]["Classe"] || "Autre";
    portfolioByClass[classe] = (portfolioByClass[classe] ?? 0) + bought;
    totalInvested += bought;
  }

  // Top 5 dépenses du mois
  const depenses = transactions.filter((t) => {
    if (t["Type"] !== "Dépense") return false;
    try {
      const d = t["Date"].split("/");
      const dt = new Date(+d[2], +d[1] - 1, +d[0]);
      return toMoisStr(dt) === currentMonth;
    } catch { return false; }
  });
  const byCategory: Record<string, number> = {};
  for (const t of depenses) {
    const cat = t["Catégorie"] || "Autre";
    byCategory[cat] = (byCategory[cat] ?? 0) + parseNum(t["Montant"]);
  }
  const top5 = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Budget santé
  const monthBudgets = budgets.filter((b) => b["Mois"] === currentMonth && b["Type"] === "Dépense");
  const budgetPrevu = monthBudgets.reduce((s, b) => s + parseNum(b["Montant_Prevu"]), 0);
  const depensesReelles = depenses.reduce((s, t) => s + parseNum(t["Montant"]), 0);
  const budgetPct = budgetPrevu > 0 ? Math.min(Math.round((depensesReelles / budgetPrevu) * 100), 100) : 0;

  // Allocation
  const allocation = [
    { name: "Cash", value: Math.round(totalCash) },
    ...Object.entries(portfolioByClass).map(([name, value]) => ({ name, value: Math.round(value) })),
  ];

  // Enveloppes d'épargne
  const activeEnvelopes = envelopes.filter((e) => e["actif"] !== "false");
  const totalEpargne = activeEnvelopes.reduce((s, e) => s + parseNum(e["montant_actuel"]), 0);
  const nonAlloue = totalCash - totalEpargne;
  const envelopesSummary = activeEnvelopes
    .sort((a, b) => parseNum(b["montant_actuel"]) - parseNum(a["montant_actuel"]))
    .slice(0, 5)
    .map((e) => ({
      nom: e["nom"],
      montant: parseNum(e["montant_actuel"]),
      objectif: parseNum(e["objectif"]),
      couleur: e["couleur"] || "#6366f1",
    }));

  // Historique patrimoine
  const history = historyRaw.map((r) => ({
    date: r["date"],
    patrimoine_net: parseNum(r["patrimoine_net"]),
    cash: parseNum(r["cash"]),
    investi: parseNum(r["investi"]),
    epargne: parseNum(r["epargne"]),
  }));

  return {
    totalCash, totalInvested, currentMonth,
    top5, allocation,
    budgetPrevu, depensesReelles, budgetPct,
    totalEpargne, nonAlloue, envelopesSummary,
    history,
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
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon size={18} className="text-white" />
          </div>
          {sub && (
            <Badge variant={trend === "up" ? "default" : trend === "down" ? "destructive" : "secondary"}
              className="text-xs font-medium">
              {sub}
            </Badge>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

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

      {/* KPIs */}
      <div className="flex gap-4">
        <StatCard
          title="Patrimoine Net"
          value={fmtCHF(data.totalCash + data.totalInvested)}
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
          title="Investi (coût)"
          value={fmtCHF(data.totalInvested)}
          icon={TrendingUp}
          iconColor="bg-violet-500"
        />
      </div>

      {/* Net Worth History */}
      <NetWorthChart history={data.history} />

      {/* Charts */}
      <DashboardCharts
        allocation={data.allocation}
        top5={data.top5}
      />

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
                  ? Math.min(Math.round((env.montant / env.objectif) * 100), 100)
                  : 0;
                return (
                  <div key={env.nom} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: env.couleur }}
                        />
                        {env.nom}
                      </span>
                      <span className="tabular-nums">
                        {fmtCHF(env.montant)}
                        {env.objectif > 0 && (
                          <span className="text-slate-300 ml-1">/ {fmtCHF(env.objectif)}</span>
                        )}
                      </span>
                    </div>
                    {env.objectif > 0 && (
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: env.couleur }}
                        />
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
                <Badge
                  variant={data.budgetPct <= 100 ? "default" : "destructive"}
                  className="text-xs"
                >
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

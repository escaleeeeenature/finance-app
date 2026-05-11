import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF, fmt, toMoisStr, FR_MONTHS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Landmark, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";

async function getDashboardData() {
  const [accounts, transactions, budgets, invest, investRef] = await Promise.all([
    readSheet("Comptes"),
    readSheet("Transactions"),
    readSheet("Budgets"),
    readSheet("Invest_Transactions"),
    readSheet("Invest_Referentiel"),
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

  return {
    totalCash, totalInvested, currentMonth,
    top5, allocation,
    budgetPrevu, depensesReelles, budgetPct,
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
        <p className="text-sm text-slate-500 mt-0.5">{data.currentMonth}</p>
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

      {/* Charts */}
      <DashboardCharts
        allocation={data.allocation}
        top5={data.top5}
      />

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

import { Suspense } from "react";
import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF, toMoisStr, FR_MONTHS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddBudgetDialog } from "@/components/budget-forms";
import { BudgetMonthSelector } from "@/components/budget-month-selector";
import { BudgetCategoryLine } from "@/components/budget-category-line";

function generateMonths(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = -6; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(toMoisStr(d));
  }
  return [...new Set(months)];
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois } = await searchParams;
  const months = generateMonths();
  const currentMonth = mois && months.includes(mois) ? mois : toMoisStr(new Date());

  const [budgets, transactions] = await Promise.all([
    readSheet("Budgets"),
    readSheet("Transactions"),
  ]);

  const monthBudget = budgets.filter((b) => b["Mois"] === currentMonth);

  const monthTrans = transactions.filter((t) => {
    try {
      const [d, m, y] = t["Date"].split("/");
      return toMoisStr(new Date(+y, +m - 1, +d)) === currentMonth;
    } catch { return false; }
  });

  const byCategory: Record<string, { total: number; txs: { date: string; libelle: string; montant: number; compte: string }[] }> = {};
  for (const t of monthTrans) {
    const cat = t["Catégorie"];
    if (!byCategory[cat]) byCategory[cat] = { total: 0, txs: [] };
    const montant = parseNum(t["Montant"]);
    byCategory[cat].total += montant;
    byCategory[cat].txs.push({
      date: t["Date"],
      libelle: t["Libellé"] || "—",
      montant,
      compte: t["Compte_Source"] || "—",
    });
  }

  const revenus = monthBudget.filter((b) => b["Type"] === "Revenu");
  const depenses = monthBudget.filter((b) => b["Type"] === "Dépense");

  const totalRevPrevu = revenus.reduce((s, b) => s + parseNum(b["Montant_Prevu"]), 0);
  const totalDepPrevu = depenses.reduce((s, b) => s + parseNum(b["Montant_Prevu"]), 0);
  const totalDepReel = depenses.reduce((s, b) => s + (byCategory[b["Catégorie"]]?.total ?? 0), 0);
  const totalRevReel = revenus.reduce((s, b) => s + (byCategory[b["Catégorie"]]?.total ?? 0), 0);
  const solde = totalRevPrevu - totalDepReel;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget</h1>
          <p className="text-sm text-slate-500 mt-0.5">{currentMonth}</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <BudgetMonthSelector months={months} selected={currentMonth} />
          </Suspense>
          <AddBudgetDialog mois={currentMonth} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Revenus prévus</p>
            <p className="text-xl font-bold tabular-nums text-emerald-600">{fmtCHF(totalRevPrevu)}</p>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">Réel : {fmtCHF(totalRevReel)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dépenses réelles</p>
            <p className="text-xl font-bold tabular-nums text-red-500">{fmtCHF(totalDepReel)}</p>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">Prévu : {fmtCHF(totalDepPrevu)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Solde disponible</p>
            <p className={`text-xl font-bold tabular-nums ${solde >= 0 ? "text-indigo-600" : "text-red-500"}`}>
              {fmtCHF(solde)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              Capacité : {fmtCHF(totalRevPrevu - totalDepPrevu)}
            </p>
          </CardContent>
        </Card>
      </div>

      {monthBudget.length === 0 && (
        <Card className="border-0 shadow-sm border-dashed border-2 border-slate-200">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500 text-sm">Aucun budget défini pour {currentMonth}.</p>
            <p className="text-slate-400 text-xs mt-1">Clique sur &quot;Ajouter une ligne&quot; pour commencer.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Revenus */}
        {revenus.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Revenus
                <span className="ml-auto text-slate-400 font-normal text-xs tabular-nums">
                  {fmtCHF(totalRevReel)} / {fmtCHF(totalRevPrevu)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {revenus.map((b, i) => (
                <BudgetCategoryLine
                  key={i}
                  mois={currentMonth}
                  categorie={b["Catégorie"]}
                  prevu={parseNum(b["Montant_Prevu"])}
                  reel={byCategory[b["Catégorie"]]?.total ?? 0}
                  transactions={byCategory[b["Catégorie"]]?.txs ?? []}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Dépenses */}
        {depenses.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Dépenses
                <span className="ml-auto text-slate-400 font-normal text-xs tabular-nums">
                  {fmtCHF(totalDepReel)} / {fmtCHF(totalDepPrevu)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {depenses.map((b, i) => (
                <BudgetCategoryLine
                  key={i}
                  mois={currentMonth}
                  categorie={b["Catégorie"]}
                  prevu={parseNum(b["Montant_Prevu"])}
                  reel={byCategory[b["Catégorie"]]?.total ?? 0}
                  transactions={byCategory[b["Catégorie"]]?.txs ?? []}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

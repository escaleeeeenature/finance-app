import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF, toMoisStr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AddBudgetDialog, EditBudgetLine } from "@/components/budget-forms";

export default async function BudgetPage() {
  const [budgets, transactions] = await Promise.all([
    readSheet("Budgets"),
    readSheet("Transactions"),
  ]);

  const now = new Date();
  const currentMonth = toMoisStr(now);

  const monthBudget = budgets.filter((b) => b["Mois"] === currentMonth);
  const monthTrans = transactions.filter((t) => {
    try {
      const [d, m, y] = t["Date"].split("/");
      return toMoisStr(new Date(+y, +m - 1, +d)) === currentMonth;
    } catch { return false; }
  });

  const byCategory: Record<string, number> = {};
  for (const t of monthTrans) {
    byCategory[t["Catégorie"]] = (byCategory[t["Catégorie"]] ?? 0) + parseNum(t["Montant"]);
  }

  const revenus = monthBudget.filter((b) => b["Type"] === "Revenu");
  const depenses = monthBudget.filter((b) => b["Type"] === "Dépense");

  const totalRevPrevu = revenus.reduce((s, b) => s + parseNum(b["Montant_Prevu"]), 0);
  const totalDepPrevu = depenses.reduce((s, b) => s + parseNum(b["Montant_Prevu"]), 0);
  const totalDepReel = depenses.reduce((s, b) => s + (byCategory[b["Catégorie"]] ?? 0), 0);
  const totalRevReel = revenus.reduce((s, b) => s + (byCategory[b["Catégorie"]] ?? 0), 0);

  function BudgetLine({ item }: { item: Record<string, string> }) {
    const prevu = parseNum(item["Montant_Prevu"]);
    const reel = byCategory[item["Catégorie"]] ?? 0;
    const pct = prevu > 0 ? Math.min(Math.round((reel / prevu) * 100), 100) : 0;
    const color = pct > 100 ? "text-red-600" : pct > 80 ? "text-amber-600" : "text-emerald-600";
    return (
      <div className="group space-y-1.5 py-3 border-b border-slate-100 last:border-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-slate-700">{item["Catégorie"]}</span>
            <EditBudgetLine mois={currentMonth} categorie={item["Catégorie"]} montantActuel={prevu} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 tabular-nums">{fmtCHF(reel)} / {fmtCHF(prevu)}</span>
            <span className={`text-xs font-semibold tabular-nums ${color}`}>{pct}%</span>
          </div>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget</h1>
          <p className="text-sm text-slate-500 mt-0.5">{currentMonth}</p>
        </div>
        <AddBudgetDialog mois={currentMonth} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Revenus prévus", value: fmtCHF(totalRevPrevu), color: "text-emerald-600" },
          { label: "Dépenses réelles", value: fmtCHF(totalDepReel), color: "text-red-500" },
          {
            label: "Solde disponible",
            value: fmtCHF(totalRevPrevu - totalDepReel),
            color: totalRevPrevu - totalDepReel >= 0 ? "text-indigo-600" : "text-red-500",
          },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Revenus */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Revenus
              <span className="ml-auto text-slate-400 font-normal text-xs">{fmtCHF(totalRevReel)} / {fmtCHF(totalRevPrevu)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenus.length > 0 ? revenus.map((b, i) => <BudgetLine key={i} item={b} />) :
              <p className="text-sm text-slate-400 py-4">Aucun revenu défini</p>}
          </CardContent>
        </Card>

        {/* Dépenses */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Dépenses
              <span className="ml-auto text-slate-400 font-normal text-xs">{fmtCHF(totalDepReel)} / {fmtCHF(totalDepPrevu)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {depenses.length > 0 ? depenses.map((b, i) => <BudgetLine key={i} item={b} />) :
              <p className="text-sm text-slate-400 py-4">Aucune dépense définie</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

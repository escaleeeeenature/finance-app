export const dynamic = "force-dynamic";

import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AddAccountDialog, TransferDialog } from "@/components/account-forms";
import { AccountCard } from "@/components/account-card";

export default async function AccountsPage() {
  const [accounts, transactions, budgets] = await Promise.all([
    readSheet("Comptes"),
    readSheet("Transactions"),
    readSheet("Budgets"),
  ]);

  const active = accounts.filter((a) => a["Statut"] === "Actif");
  const totalCash = active.reduce((s, a) => s + parseNum(a["Solde_Initial"]), 0);

  // Sort transactions by date desc + keep original index
  const sortedTx = (transactions
    .map((t, i) => ({ ...t, _idx: String(i) })) as Record<string, string>[])
    .sort((a, b) => {
      const toTs = (s: string) => {
        const [d, m, y] = (s || "01/01/2000").split("/");
        return new Date(+y, +m - 1, +d).getTime();
      };
      return toTs(b["Date"]) - toTs(a["Date"]);
    });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comptes Bancaires</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vue de tes liquidités</p>
        </div>
        <div className="flex gap-2">
          <TransferDialog accounts={active} />
          <AddAccountDialog />
        </div>
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-indigo-200">Total Cash</p>
          <p className="text-4xl font-bold tabular-nums mt-1">{fmtCHF(totalCash)}</p>
          <p className="text-sm text-indigo-200 mt-1">
            {active.length} compte{active.length > 1 ? "s" : ""} actif{active.length > 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {active.map((acc, i) => {
          const solde = parseNum(acc["Solde_Initial"]);
          const pct = totalCash > 0 ? (solde / totalCash) * 100 : 0;
          const accTx = sortedTx.filter(
            (t) => t["Compte_Source"] === acc["Banque"] || t["Compte_Source"] === acc["Nom"]
          );
          return (
            <AccountCard
              key={i}
              nom={acc["Banque"] || acc["Nom"] || "Compte"}
              type={acc["Type"] || ""}
              solde={solde}
              pct={pct}
              couleur={acc["Couleur_Graphique"] || "#6366f1"}
              transactions={accTx}
              accounts={active}
              budgets={budgets}
            />
          );
        })}
      </div>
    </div>
  );
}

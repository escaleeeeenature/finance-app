export const dynamic = "force-dynamic";

import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddTransactionDialog } from "@/components/expense-form";
import { RevolutImport } from "@/components/revolut-import";
import { TransactionList } from "@/components/transaction-list";

export default async function ExpensesPage() {
  const [transactions, accounts, budgets] = await Promise.all([
    readSheet("Transactions"),
    readSheet("Comptes"),
    readSheet("Budgets"),
  ]);

  const activeAccounts = accounts.filter((a) => a["Statut"] === "Actif");

  // Sort by date desc, keep original row index for edit/delete
  const sorted = (transactions
    .map((t, i) => ({ ...t, _idx: String(i) })) as Record<string, string>[])
    .sort((a, b) => {
      const toDate = (s: string) => {
        const [d, m, y] = (s || "01/01/2000").split("/");
        return new Date(+y, +m - 1, +d).getTime();
      };
      return toDate(b["Date"]) - toDate(a["Date"]);
    });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dépenses & Revenus</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {transactions.length} opération{transactions.length > 1 ? "s" : ""} enregistrée{transactions.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <RevolutImport accounts={activeAccounts} budgets={budgets} />
          <AddTransactionDialog accounts={activeAccounts} budgets={budgets} />
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Historique récent</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TransactionList
            transactions={sorted}
            accounts={activeAccounts}
            budgets={budgets}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
import { AddTransactionDialog } from "@/components/expense-form";
import { RevolutImport } from "@/components/revolut-import";

export default async function ExpensesPage() {
  const [transactions, accounts, budgets] = await Promise.all([
    readSheet("Transactions"),
    readSheet("Comptes"),
    readSheet("Budgets"),
  ]);

  const activeAccounts = accounts.filter((a) => a["Statut"] === "Actif");

  const sorted = [...transactions].sort((a, b) => {
    const toDate = (s: string) => {
      const [d, m, y] = s.split("/");
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
          <div className="divide-y divide-slate-100">
            {sorted.slice(0, 100).map((t, i) => {
              const isDep = t["Type"] === "Dépense";
              const isRev = t["Type"] === "Revenu";
              const isTransfer = t["Type"] === "Transfert";
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`p-2 rounded-full ${isDep ? "bg-red-50" : isRev ? "bg-emerald-50" : "bg-slate-100"}`}>
                    {isDep ? <ArrowDownCircle size={16} className="text-red-500" /> :
                     isRev ? <ArrowUpCircle size={16} className="text-emerald-500" /> :
                     <ArrowLeftRight size={16} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{t["Libellé"] || "—"}</p>
                    <p className="text-xs text-slate-400">
                      {t["Date"]} · {t["Catégorie"]} · {t["Compte_Source"]}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${isDep ? "text-red-500" : isRev ? "text-emerald-600" : "text-slate-400"}`}>
                    {isDep ? "−" : isRev ? "+" : ""}{fmtCHF(parseNum(t["Montant"]))}
                  </span>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-12">Aucune transaction enregistrée</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

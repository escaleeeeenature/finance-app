import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF, toMoisStr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export default async function ExpensesPage() {
  const [transactions, accounts] = await Promise.all([
    readSheet("Transactions"),
    readSheet("Comptes"),
  ]);

  const sorted = [...transactions].sort((a, b) => {
    const toDate = (s: string) => { const [d, m, y] = s.split("/"); return new Date(+y, +m - 1, +d).getTime(); };
    return toDate(b["Date"]) - toDate(a["Date"]);
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dépenses & Revenus</h1>
        <p className="text-sm text-slate-500 mt-0.5">Historique de toutes tes opérations</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Historique ({transactions.length} opérations)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {sorted.slice(0, 50).map((t, i) => {
              const isDep = t["Type"] === "Dépense";
              const isRev = t["Type"] === "Revenu";
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`p-2 rounded-full ${isDep ? "bg-red-50" : isRev ? "bg-emerald-50" : "bg-slate-100"}`}>
                    {isDep ? <ArrowDownCircle size={16} className="text-red-500" /> :
                     isRev ? <ArrowUpCircle size={16} className="text-emerald-500" /> :
                     <ArrowUpCircle size={16} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{t["Libellé"] || "—"}</p>
                    <p className="text-xs text-slate-400">{t["Date"]} · {t["Catégorie"]} · {t["Compte_Source"]}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${isDep ? "text-red-500" : isRev ? "text-emerald-600" : "text-slate-500"}`}>
                    {isDep ? "-" : isRev ? "+" : ""}{fmtCHF(parseNum(t["Montant"]))}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

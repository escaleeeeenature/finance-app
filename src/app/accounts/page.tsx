import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AccountsPage() {
  const accounts = await readSheet("Comptes");
  const active = accounts.filter((a) => a["Statut"] === "Actif");
  const totalCash = active.reduce((s, a) => s + parseNum(a["Solde_Initial"]), 0);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Comptes Bancaires</h1>
        <p className="text-sm text-slate-500 mt-0.5">Vue de tes liquidités</p>
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-indigo-200">Total Cash</p>
          <p className="text-4xl font-bold tabular-nums mt-1">{fmtCHF(totalCash)}</p>
          <p className="text-sm text-indigo-200 mt-1">{active.length} compte{active.length > 1 ? "s" : ""} actif{active.length > 1 ? "s" : ""}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {active.map((acc, i) => {
          const solde = parseNum(acc["Solde_Initial"]);
          const pct = totalCash > 0 ? (solde / totalCash) * 100 : 0;
          return (
            <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{acc["Banque"]}</p>
                    <p className="text-xs text-slate-400">{acc["Type"]}</p>
                  </div>
                  <div
                    className="h-3 w-3 rounded-full mt-1"
                    style={{ background: acc["Couleur_Graphique"] || "#6366f1" }}
                  />
                </div>
                <p className="text-2xl font-bold tabular-nums text-slate-900">{fmtCHF(solde)}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Part du total</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: acc["Couleur_Graphique"] || "#6366f1" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

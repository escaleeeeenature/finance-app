import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF, fmt } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddInvestDialog, ManualPriceDialog } from "@/components/investment-forms";

export default async function InvestmentsPage() {
  const [invest, investRef, accounts, budgets] = await Promise.all([
    readSheet("Invest_Transactions"),
    readSheet("Invest_Referentiel"),
    readSheet("Comptes"),
    readSheet("Budgets"),
  ]);

  const activeAccounts = accounts.filter((a) => a["Statut"] === "Actif");
  const budgetCats = [...new Set(budgets.filter((b) => b["Type"] === "Dépense").map((b) => b["Catégorie"]))];
  const manualAssets = investRef.filter((r) => r["Manuel"] === "TRUE" || r["Manuel"] === "Vrai" || r["Manuel"] === "true");

  type Position = {
    ticker: string; classe: string; qte: number;
    investi: number; pru: number; valeur: number; perf: number; perfPct: number;
  };

  const tickers = [...new Set(invest.map((r) => r["Symbole"]))];
  const positions: Position[] = [];
  let totalInvested = 0;

  for (const ticker of tickers) {
    const rows = invest.filter((r) => r["Symbole"] === ticker);
    const buys = rows.filter((r) => r["Type"] === "Achat");
    const sells = rows.filter((r) => r["Type"] === "Vente");
    const boughtQte = buys.reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    const soldQte = sells.reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    const qte = boughtQte - soldQte;
    if (qte <= 0) continue;

    const investi = buys.reduce(
      (s, r) => s + parseNum(r["Quantité"]) * parseNum(r["Prix_Unitaire"]) + parseNum(r["Frais"]), 0
    );
    const pru = boughtQte > 0 ? investi / boughtQte : 0;

    // Prix marché : chercher dans le référentiel (prix manuel uniquement côté serveur)
    let prixMarche = pru;
    const ref = investRef.find((r) => r["Symbole"] === ticker);
    if (ref && (ref["Manuel"] === "TRUE" || ref["Manuel"] === "Vrai" || ref["Manuel"] === "true")) {
      const pm = parseNum(ref["Prix_Manuel"]);
      if (pm > 0) prixMarche = pm;
    }

    const valeur = qte * prixMarche;
    const perf = valeur - investi;
    const perfPct = investi > 0 ? (perf / investi) * 100 : 0;
    const classe = rows[0]["Classe"] || "Autre";

    totalInvested += investi;
    positions.push({ ticker, classe, qte, investi, pru, valeur, perf, perfPct });
  }

  const totalValeur = positions.reduce((s, p) => s + p.valeur, 0);
  const totalPerf = totalValeur - totalInvested;
  const totalPerfPct = totalInvested > 0 ? (totalPerf / totalInvested) * 100 : 0;
  const classes = [...new Set(positions.map((p) => p.classe))];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Investissements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Portefeuille — {positions.length} position{positions.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <ManualPriceDialog manualAssets={manualAssets} />
          <AddInvestDialog accounts={activeAccounts} budgetCats={budgetCats} />
        </div>
      </div>

      {/* Hero */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
        <CardContent className="p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-400">Valeur totale</p>
              <p className="text-4xl font-bold tabular-nums mt-1">{fmtCHF(totalValeur)}</p>
              <p className="text-sm text-slate-400 mt-1">Investi : {fmtCHF(totalInvested)}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold tabular-nums ${totalPerf >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalPerf >= 0 ? "+" : ""}{fmtCHF(totalPerf)}
              </p>
              <p className={`text-sm ${totalPerf >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalPerfPct >= 0 ? "+" : ""}{totalPerfPct.toFixed(2)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Par classe */}
      {classes.map((classe) => {
        const items = positions.filter((p) => p.classe === classe);
        const classeVal = items.reduce((s, p) => s + p.valeur, 0);
        const classeInv = items.reduce((s, p) => s + p.investi, 0);
        const classePerf = classeVal - classeInv;
        return (
          <Card key={classe} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{classe}</Badge>
                <span className="text-slate-400 font-normal">{fmtCHF(classeVal)}</span>
                <span className={`text-xs font-medium ml-auto ${classePerf >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {classePerf >= 0 ? "+" : ""}{fmtCHF(classePerf)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                    {["Actif", "Quantité", "PRU", "Investi", "Valeur", "Perf."].map((h) => (
                      <th key={h} className="text-left px-6 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((pos) => (
                    <tr key={pos.ticker} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{pos.ticker}</td>
                      <td className="px-6 py-3 tabular-nums text-slate-600">{fmt(pos.qte, 4)}</td>
                      <td className="px-6 py-3 tabular-nums text-slate-600">{fmtCHF(pos.pru)}</td>
                      <td className="px-6 py-3 tabular-nums text-slate-600">{fmtCHF(pos.investi)}</td>
                      <td className="px-6 py-3 tabular-nums font-medium text-slate-800">{fmtCHF(pos.valeur)}</td>
                      <td className={`px-6 py-3 tabular-nums font-medium ${pos.perf >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {pos.perf >= 0 ? "+" : ""}{fmtCHF(pos.perf)}
                        <span className="text-xs ml-1 opacity-70">({pos.perfPct >= 0 ? "+" : ""}{pos.perfPct.toFixed(1)}%)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}

      {positions.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-12">Aucune position ouverte</p>
      )}
    </div>
  );
}

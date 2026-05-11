import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF, fmt } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

export default async function InvestmentsPage() {
  const [invest, investRef] = await Promise.all([
    readSheet("Invest_Transactions"),
    readSheet("Invest_Referentiel"),
  ]);

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

    const investi = buys.reduce((s, r) => s + parseNum(r["Quantité"]) * parseNum(r["Prix_Unitaire"]) + parseNum(r["Frais"]), 0);
    const pru = boughtQte > 0 ? investi / boughtQte : 0;
    const valeur = qte * pru; // fallback : PRU si pas de prix marché
    const perf = valeur - investi;
    const perfPct = investi > 0 ? (perf / investi) * 100 : 0;
    const classe = rows[0]["Classe"] || "Autre";

    totalInvested += investi;
    positions.push({ ticker, classe, qte, investi, pru, valeur, perf, perfPct });
  }

  const classes = [...new Set(positions.map((p) => p.classe))];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Investissements</h1>
        <p className="text-sm text-slate-500 mt-0.5">Portefeuille au coût d&apos;acquisition</p>
      </div>

      {/* Hero */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
        <CardContent className="p-6">
          <p className="text-sm text-slate-400">Total investi</p>
          <p className="text-4xl font-bold tabular-nums mt-1">{fmtCHF(totalInvested)}</p>
          <p className="text-sm text-slate-400 mt-1">{positions.length} position{positions.length > 1 ? "s" : ""}</p>
        </CardContent>
      </Card>

      {/* Par classe */}
      {classes.map((classe) => {
        const items = positions.filter((p) => p.classe === classe);
        return (
          <Card key={classe} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Badge variant="secondary">{classe}</Badge>
                <span className="text-slate-400 font-normal">
                  {fmtCHF(items.reduce((s, p) => s + p.investi, 0))}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                    {["Actif", "Quantité", "PRU", "Investi"].map((h) => (
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
                      <td className="px-6 py-3 tabular-nums font-medium text-slate-800">{fmtCHF(pos.investi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

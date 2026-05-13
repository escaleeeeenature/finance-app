export const dynamic = "force-dynamic";

import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF, fmt } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Wifi, WifiOff, Receipt, Gift } from "lucide-react";
import { AddInvestDialog, ManualPriceDialog } from "@/components/investment-forms";
import { fetchPrices, fetchToChf } from "@/lib/prices";
import { ETFLookthrough } from "@/components/etf-lookthrough";
import { ETF_DATA } from "@/lib/etf-composition";
import { computeXIRR } from "@/lib/xirr";
import { Activity } from "lucide-react";
import Link from "next/link";

function PerfBadge({ value, pct }: { value: number; pct: number }) {
  const color = value > 0 ? "text-emerald-600" : value < 0 ? "text-red-500" : "text-slate-400";
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <span className={`flex items-center gap-1 font-medium tabular-nums ${color}`}>
      <Icon size={13} />
      {value >= 0 ? "+" : ""}{fmtCHF(value)}
      <span className="text-xs opacity-70">({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)</span>
    </span>
  );
}

export default async function InvestmentsPage() {
  const [invest, investRef, accounts, budgets, fraisRows, dividendesRows] = await Promise.all([
    readSheet("Invest_Transactions"),
    readSheet("Invest_Referentiel"),
    readSheet("Comptes"),
    readSheet("Budgets"),
    readSheet("Frais_Courtier"),
    readSheet("Dividendes"),
  ]);

  const activeAccounts = accounts.filter((a) => a["Statut"] === "Actif");
  const budgetCats = [...new Set(budgets.filter((b) => b["Type"] === "Dépense").map((b) => b["Catégorie"]))];
  const manualAssets = investRef.filter((r) => ["TRUE", "Vrai", "true"].includes(r["Manuel"]));

  // ── Build positions ───────────────────────────────────────────────
  type Position = {
    ticker: string; classe: string; qte: number;
    coutTotal: number; pru: number;
    valeurChf: number; perf: number; perfPct: number;
    prixLive: number | null; devisePos: string; live: boolean;
  };

  const tickers = [...new Set(invest.map((r) => r["Symbole"]))];
  const openTickers: string[] = [];

  // First pass: find open positions
  for (const ticker of tickers) {
    const rows = invest.filter((r) => r["Symbole"] === ticker);
    const boughtQte = rows.filter((r) => r["Type"] === "Achat").reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    const soldQte = rows.filter((r) => r["Type"] === "Vente").reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    if (boughtQte - soldQte > 0) openTickers.push(ticker);
  }

  // Fetch live prices for open positions
  const liveMap = await fetchPrices(openTickers);

  // Fetch FX rates for non-CHF positions
  const currencies = new Set<string>();
  for (const [, p] of Object.entries(liveMap)) {
    if (p.currency !== "CHF") currencies.add(p.currency);
  }
  const fxRates: Record<string, number> = { CHF: 1 };
  await Promise.all([...currencies].map(async (ccy) => {
    fxRates[ccy] = await fetchToChf(ccy);
  }));

  const positions: Position[] = [];
  let totalCout = 0;

  for (const ticker of openTickers) {
    const rows = invest.filter((r) => r["Symbole"] === ticker);
    const buys = rows.filter((r) => r["Type"] === "Achat");
    const boughtQte = buys.reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    const soldQte = rows.filter((r) => r["Type"] === "Vente").reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    const qte = boughtQte - soldQte;
    if (qte <= 0) continue;

    const coutTotal = buys.reduce(
      (s, r) => s + parseNum(r["Quantité"]) * parseNum(r["Prix_Unitaire"]) + parseNum(r["Frais"]), 0
    );
    const pru = boughtQte > 0 ? coutTotal / boughtQte : 0;

    // Live price
    const liveData = liveMap[ticker];
    let prixLive: number | null = null;
    let devisePos = "CHF";
    let live = false;

    if (liveData) {
      prixLive = liveData.price;
      devisePos = liveData.currency;
      live = true;
    } else {
      // Fallback: manual price from referentiel
      const ref = investRef.find((r) => r["Symbole"] === ticker);
      if (ref && ["TRUE", "Vrai", "true"].includes(ref["Manuel"])) {
        const pm = parseNum(ref["Prix_Manuel"]);
        if (pm > 0) { prixLive = pm; live = false; }
      }
    }

    const fxRate = fxRates[devisePos] ?? 1;
    const valeurChf = prixLive ? qte * prixLive * fxRate : coutTotal;
    const perf = valeurChf - coutTotal;
    const perfPct = coutTotal > 0 ? (perf / coutTotal) * 100 : 0;
    const classe = rows[0]["Classe"] || "Autre";

    totalCout += coutTotal;
    positions.push({ ticker, classe, qte, coutTotal, pru, valeurChf, perf, perfPct, prixLive, devisePos, live });
  }

  const totalValeur = positions.reduce((s, p) => s + p.valeurChf, 0);
  const totalPerf = totalValeur - totalCout;
  const totalPerfPct = totalCout > 0 ? (totalPerf / totalCout) * 100 : 0;
  const hasLive = positions.some((p) => p.live);

  // ── Frais analytics ──────────────────────────────────────────────
  const currentYear = new Date().getFullYear().toString();

  const fraisAnnee = fraisRows.filter((r) => {
    const y = r["date"]?.split("/")?.[2];
    return y === currentYear;
  });
  const totalFraisGarde = fraisAnnee
    .filter((r) => r["type"] === "Droits de Garde")
    .reduce((s, r) => s + parseNum(r["montant"]), 0);

  const totalFraisTx = invest
    .filter((r) => {
      const y = r["date"]?.split("/")?.[2];
      return y === currentYear;
    })
    .reduce((s, r) => s + parseNum(r["Frais"]), 0);

  const totalFrais = totalFraisGarde + totalFraisTx;
  const fraisRatio = totalValeur > 0 ? (totalFrais / totalValeur) * 100 : 0;

  // ── Dividendes ───────────────────────────────────────────────────
  const totalDividendes = dividendesRows.reduce((s, r) => s + parseNum(r["montant"]), 0);
  const dividendesParTicker = dividendesRows.reduce<Record<string, number>>((acc, r) => {
    acc[r["symbole"]] = (acc[r["symbole"]] ?? 0) + parseNum(r["montant"]);
    return acc;
  }, {});

  // ── XIRR global ──────────────────────────────────────────────────
  const xirrGlobal = computeXIRR({
    transactions: invest.filter((r) => r["date"]).map((r) => ({
      date: r["date"],
      type: r["Type"],
      quantite: parseNum(r["Quantité"]),
      prixUnitaire: parseNum(r["Prix_Unitaire"]),
      frais: parseNum(r["Frais"]),
    })),
    currentValueChf: totalValeur,
    dividendes: dividendesRows.map((r) => ({
      date: r["date"],
      montant: parseNum(r["montant"]),
    })),
  });

  // ── XIRR par position ────────────────────────────────────────────
  const xirrByTicker: Record<string, ReturnType<typeof computeXIRR>> = {};
  for (const pos of positions) {
    const txs = invest.filter((r) => r["Symbole"] === pos.ticker && r["date"]);
    const divs = dividendesRows.filter((r) => r["symbole"] === pos.ticker);
    xirrByTicker[pos.ticker] = computeXIRR({
      transactions: txs.map((r) => ({
        date: r["date"],
        type: r["Type"],
        quantite: parseNum(r["Quantité"]),
        prixUnitaire: parseNum(r["Prix_Unitaire"]),
        frais: parseNum(r["Frais"]),
      })),
      currentValueChf: pos.valeurChf,
      dividendes: divs.map((r) => ({ date: r["date"], montant: parseNum(r["montant"]) })),
    });
  }

  // ── Performance nette ─────────────────────────────────────────────
  const perfNette = totalPerf - totalFrais + totalDividendes;
  const perfNettePct = totalCout > 0 ? (perfNette / totalCout) * 100 : 0;

  const classes = [...new Set(positions.map((p) => p.classe))];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Investissements
            {hasLive
              ? <span className="flex items-center gap-1 text-xs font-normal text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full"><Wifi size={11} /> Live</span>
              : <span className="flex items-center gap-1 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"><WifiOff size={11} /> Coût</span>
            }
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{positions.length} position{positions.length !== 1 ? "s" : ""} ouverte{positions.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/import">
            <button className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
              Import Swissquote
            </button>
          </Link>
          <ManualPriceDialog manualAssets={manualAssets} />
          <AddInvestDialog accounts={activeAccounts} budgetCats={budgetCats} />
        </div>
      </div>

      {/* Hero */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-indigo-900 text-white overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-slate-400 mb-1">Valeur totale</p>
              <p className="text-3xl font-bold tabular-nums">{fmtCHF(totalValeur)}</p>
              <p className="text-xs text-slate-400 mt-1">Coût : {fmtCHF(totalCout)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Plus-value brute</p>
              <p className={`text-2xl font-bold tabular-nums ${totalPerf >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalPerf >= 0 ? "+" : ""}{fmtCHF(totalPerf)}
              </p>
              <p className={`text-xs ${totalPerf >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalPerfPct >= 0 ? "+" : ""}{totalPerfPct.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Frais {currentYear}</p>
              <p className="text-2xl font-bold text-orange-400 tabular-nums">-{fmtCHF(totalFrais)}</p>
              <p className="text-xs text-orange-400">{fraisRatio.toFixed(2)}% du portefeuille</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Performance nette</p>
              <p className={`text-2xl font-bold tabular-nums ${perfNette >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {perfNette >= 0 ? "+" : ""}{fmtCHF(perfNette)}
              </p>
              <p className={`text-xs ${perfNette >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                après frais{totalDividendes > 0 ? " + dividendes" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positions par classe */}
      {classes.map((classe) => {
        const items = positions.filter((p) => p.classe === classe);
        const classeVal = items.reduce((s, p) => s + p.valeurChf, 0);
        const classeCout = items.reduce((s, p) => s + p.coutTotal, 0);
        const classePerf = classeVal - classeCout;
        const classePerfPct = classeCout > 0 ? (classePerf / classeCout) * 100 : 0;
        return (
          <Card key={classe} className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 px-6">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="text-xs">{classe}</Badge>
                <span className="text-slate-500 font-normal tabular-nums">{fmtCHF(classeVal)}</span>
                <span className={`text-xs font-medium ml-auto tabular-nums ${classePerf >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {classePerf >= 0 ? "+" : ""}{fmtCHF(classePerf)} ({classePerfPct >= 0 ? "+" : ""}{classePerfPct.toFixed(1)}%)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/50 text-xs text-slate-400 font-medium">
                    <th className="text-left px-6 py-2">Actif</th>
                    <th className="text-right px-4 py-2">Qté</th>
                    <th className="text-right px-4 py-2">PRU</th>
                    <th className="text-right px-4 py-2">Prix live</th>
                    <th className="text-right px-4 py-2">Valeur CHF</th>
                    <th className="text-right px-6 py-2">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((pos) => (
                    <tr key={pos.ticker} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{pos.ticker}</span>
                          {dividendesParTicker[pos.ticker] && (
                            <span className="text-xs text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Gift size={9} />+{fmtCHF(dividendesParTicker[pos.ticker])}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Coût : {fmtCHF(pos.coutTotal)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{fmt(pos.qte, 2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500 text-xs">
                        {fmtCHF(pos.pru)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pos.prixLive ? (
                          <div>
                            <span className="tabular-nums font-medium text-slate-800">
                              {pos.prixLive.toFixed(3)}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">{pos.devisePos}</span>
                            {!pos.live && <span className="block text-xs text-slate-300">manuel</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">
                        {fmtCHF(pos.valeurChf)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <PerfBadge value={pos.perf} pct={pos.perfPct} />
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

      {/* TRI / XIRR */}
      {xirrGlobal && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Activity size={15} className="text-indigo-400" />
              Performance réelle — TRI annualisé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* TRI global */}
              <div>
                <p className="text-xs text-slate-400 mb-1">TRI global</p>
                <p className={`text-3xl font-bold tabular-nums ${xirrGlobal.pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {xirrGlobal.pct >= 0 ? "+" : ""}{xirrGlobal.pct.toFixed(1)}%
                  <span className="text-sm font-normal text-slate-400 ml-1">/an</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  sur {Math.round(xirrGlobal.months)} mois de détention
                </p>
              </div>

              {/* Simple return (non annualisé) */}
              <div>
                <p className="text-xs text-slate-400 mb-1">Rendement simple</p>
                <p className={`text-3xl font-bold tabular-nums ${totalPerfPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {totalPerfPct >= 0 ? "+" : ""}{totalPerfPct.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400 mt-1">total non annualisé</p>
              </div>

              {/* Performance nette après frais */}
              <div>
                <p className="text-xs text-slate-400 mb-1">Après frais & dividendes</p>
                <p className={`text-3xl font-bold tabular-nums ${perfNette >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {perfNette >= 0 ? "+" : ""}{fmtCHF(perfNette)}
                </p>
                <p className="text-xs text-slate-400 mt-1">gain net réel</p>
              </div>

              {/* TRI par ticker */}
              <div>
                <p className="text-xs text-slate-400 mb-2">TRI par position</p>
                <div className="space-y-1.5">
                  {positions.map((pos) => {
                    const r = xirrByTicker[pos.ticker];
                    if (!r) return null;
                    return (
                      <div key={pos.ticker} className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-600">{pos.ticker}</span>
                        <span className={`text-xs font-bold tabular-nums ${r.pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {r.pct >= 0 ? "+" : ""}{r.pct.toFixed(1)}%/an
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 text-xs text-slate-500">
              <strong>TRI (Taux de Rendement Interne)</strong> — contrairement au rendement simple,
              le TRI tient compte du <em>moment</em> où tu as investi chaque franc.
              Un investissement de 1 000 CHF en janvier rapporte plus qu&apos;en décembre sur la même année.
            </div>
          </CardContent>
        </Card>
      )}

      {/* ETF Look-through */}
      {(() => {
        const etfCompositions = positions
          .filter((p) => ETF_DATA[p.ticker])
          .map((p) => ({ etf: ETF_DATA[p.ticker], valeurChf: p.valeurChf }));
        return etfCompositions.length > 0
          ? <ETFLookthrough compositions={etfCompositions} />
          : null;
      })()}

      {/* Coûts & Revenus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Frais */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Receipt size={15} className="text-orange-400" />
              Coûts {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Frais de transaction</span>
              <span className="tabular-nums font-medium text-slate-800">-{fmtCHF(totalFraisTx)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Droits de garde</span>
              <span className="tabular-nums font-medium text-slate-800">-{fmtCHF(totalFraisGarde)}</span>
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between text-sm font-semibold">
              <span className="text-slate-700">Total frais</span>
              <span className="tabular-nums text-orange-600">-{fmtCHF(totalFrais)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Ratio frais / portefeuille</span>
              <span className="tabular-nums">{fraisRatio.toFixed(2)}%</span>
            </div>
            {fraisRows.length === 0 && (
              <p className="text-xs text-slate-300 text-center pt-2">
                Importe ton relevé Swissquote pour voir tes frais
              </p>
            )}
          </CardContent>
        </Card>

        {/* Dividendes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Gift size={15} className="text-emerald-400" />
              Dividendes reçus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(dividendesParTicker).length > 0 ? (
              <>
                {Object.entries(dividendesParTicker).map(([ticker, montant]) => (
                  <div key={ticker} className="flex justify-between text-sm">
                    <span className="text-slate-500">{ticker}</span>
                    <span className="tabular-nums font-medium text-emerald-600">+{fmtCHF(montant)}</span>
                  </div>
                ))}
                <div className="border-t border-slate-100 pt-3 flex justify-between text-sm font-semibold">
                  <span className="text-slate-700">Total dividendes</span>
                  <span className="tabular-nums text-emerald-600">+{fmtCHF(totalDividendes)}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-300 text-center py-4">
                Aucun dividende enregistré.<br />Importe ton relevé Swissquote.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

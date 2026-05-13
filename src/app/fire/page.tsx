export const dynamic = "force-dynamic";

import { readSheet } from "@/lib/sheets";
import { parseNum, toMoisStr } from "@/lib/utils";
import { Flame } from "lucide-react";
import { FireSimulator } from "@/components/fire-simulator";

async function getFireData() {
  const [accounts, transactions, invest] = await Promise.all([
    readSheet("Comptes"),
    readSheet("Transactions"),
    readSheet("Invest_Transactions"),
  ]);

  // Patrimoine actuel — cash
  const totalCash = accounts
    .filter((a) => a["Statut"] === "Actif")
    .reduce((s, a) => s + parseNum(a["Solde_Initial"]), 0);

  // Patrimoine actuel — investi (coût)
  const tickers = [...new Set(invest.map((r) => r["Symbole"]))];
  let totalInvested = 0;
  for (const ticker of tickers) {
    const rows = invest.filter((r) => r["Symbole"] === ticker);
    const boughtQte = rows.filter((r) => r["Type"] === "Achat").reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    const soldQte = rows.filter((r) => r["Type"] === "Vente").reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    if (boughtQte - soldQte <= 0) continue;
    totalInvested += rows.filter((r) => r["Type"] === "Achat").reduce(
      (s, r) => s + parseNum(r["Quantité"]) * parseNum(r["Prix_Unitaire"]) + parseNum(r["Frais"]), 0
    );
  }

  const patrimoineActuel = totalCash + totalInvested;

  // Moyenne dépenses et revenus sur les 6 derniers mois
  const now = new Date();
  const monthsSet = new Set<string>();
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsSet.add(toMoisStr(d));
  }

  let totalDepenses = 0;
  let totalRevenus = 0;
  const monthsWithData = new Set<string>();

  for (const t of transactions) {
    const parts = t["Date"]?.split("/");
    if (!parts || parts.length !== 3) continue;
    const [d, m, y] = parts;
    const dt = new Date(+y, +m - 1, +d);
    const moisStr = toMoisStr(dt);
    if (!monthsSet.has(moisStr)) continue;
    if (t["Type"] === "Dépense") {
      totalDepenses += parseNum(t["Montant"]);
      monthsWithData.add(moisStr);
    }
    if (t["Type"] === "Revenu") {
      totalRevenus += parseNum(t["Montant"]);
    }
  }

  const nbMois = Math.max(monthsWithData.size, 1);
  const depensesMoyennes = totalDepenses / nbMois;
  const revenusMoyens = totalRevenus / nbMois;

  return { patrimoineActuel, depensesMoyennes, revenusMoyens };
}

export default async function FirePage() {
  const { patrimoineActuel, depensesMoyennes, revenusMoyens } = await getFireData();

  // Age par défaut — l'utilisateur peut ajuster via le slider
  const AGE_PAR_DEFAUT = 25;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Flame size={22} className="text-orange-500" />
          Simulateur FIRE
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Financial Independence, Retire Early — basé sur tes vraies données
        </p>
      </div>

      <FireSimulator
        patrimoineActuel={patrimoineActuel}
        depensesMoyennes={depensesMoyennes}
        revenusMoyens={revenusMoyens}
        age={AGE_PAR_DEFAUT}
      />
    </div>
  );
}

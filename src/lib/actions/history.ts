"use server";
import { revalidatePath } from "next/cache";
import { readSheet, appendRow } from "@/lib/sheets";
import { parseNum } from "@/lib/utils";

export async function recordSnapshot() {
  const [accounts, invest, envelopes] = await Promise.all([
    readSheet("Comptes"),
    readSheet("Invest_Transactions"),
    readSheet("Enveloppes"),
  ]);

  // Cash total (comptes actifs)
  const totalCash = accounts
    .filter((a) => a["Statut"] === "Actif")
    .reduce((s, a) => s + parseNum(a["Solde_Initial"]), 0);

  // Investi (coût d'achat, positions ouvertes seulement)
  const tickers = [...new Set(invest.map((r) => r["Symbole"]))];
  let totalInvested = 0;
  for (const ticker of tickers) {
    const rows = invest.filter((r) => r["Symbole"] === ticker);
    const boughtQte = rows
      .filter((r) => r["Type"] === "Achat")
      .reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    const soldQte = rows
      .filter((r) => r["Type"] === "Vente")
      .reduce((s, r) => s + parseNum(r["Quantité"]), 0);
    if (boughtQte - soldQte <= 0) continue;
    const cost = rows
      .filter((r) => r["Type"] === "Achat")
      .reduce(
        (s, r) =>
          s + parseNum(r["Quantité"]) * parseNum(r["Prix_Unitaire"]) + parseNum(r["Frais"]),
        0
      );
    totalInvested += cost;
  }

  // Épargne fléchée
  const totalEpargne = envelopes
    .filter((e) => e["actif"] !== "false")
    .reduce((s, e) => s + parseNum(e["montant_actuel"]), 0);

  const patrimoineNet = totalCash + totalInvested;

  const now = new Date();
  const date = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

  await appendRow("Historique", {
    date,
    patrimoine_net: patrimoineNet.toFixed(2),
    cash: totalCash.toFixed(2),
    investi: totalInvested.toFixed(2),
    epargne: totalEpargne.toFixed(2),
  });

  revalidatePath("/dashboard");
}

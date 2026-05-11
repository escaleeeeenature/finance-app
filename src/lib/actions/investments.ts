"use server";
import { revalidatePath } from "next/cache";
import { readSheet, appendRow, writeSheet } from "@/lib/sheets";
import { parseNum } from "@/lib/utils";

export async function addInvestTransaction(formData: FormData) {
  const date = formData.get("date") as string;
  const type = formData.get("type") as string;
  const classe = formData.get("classe") as string;
  const symbole = (formData.get("symbole") as string).trim();
  const qte = formData.get("qte") as string;
  const prix = formData.get("prix") as string;
  const frais = formData.get("frais") as string;
  const compte = formData.get("compte") as string;
  const categorie = formData.get("categorie") as string;
  const isStockInitial = formData.get("isStockInitial") === "true";

  if (!symbole || !qte || !prix) return { error: "Champs requis manquants" };

  const qteNum = parseNum(qte);
  const prixNum = parseNum(prix);
  const fraisNum = parseNum(frais || "0");
  const montant = type === "Achat" ? qteNum * prixNum + fraisNum : qteNum * prixNum - fraisNum;

  const investRow = appendRow("Invest_Transactions", {
    Date: date, Type: type, Classe: classe, Symbole: symbole,
    "Quantité": qte, Prix_Unitaire: prix, Frais: frais || "0",
    Compte_Source: isStockInitial ? "Stock Initial" : compte,
  });

  if (!isStockInitial) {
    const accounts = await readSheet("Comptes");
    const idx = accounts.findIndex((a) => a["Banque"] === compte);
    if (idx !== -1) {
      const delta = type === "Achat" ? -montant : montant;
      accounts[idx]["Solde_Initial"] = (parseNum(accounts[idx]["Solde_Initial"]) + delta).toString();
      await writeSheet("Comptes", accounts);
    }

    // Parallelize the two independent sheet appends
    await Promise.all([
      investRow,
      appendRow("Transactions", {
        Date: date, "Libellé": `${type} ${symbole}`, Montant: montant.toString(),
        "Catégorie": categorie, Compte_Source: compte, Statut: "Validé",
        Type: type === "Achat" ? "Dépense" : "Revenu",
      }),
    ]);
  } else {
    await investRow;
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function updateManualPrice(symbole: string, prix: string) {
  const ref = await readSheet("Invest_Referentiel");
  const idx = ref.findIndex((r) => r["Symbole"] === symbole);
  if (idx !== -1) {
    ref[idx]["Prix_Manuel"] = prix;
    await writeSheet("Invest_Referentiel", ref);
  }
  revalidatePath("/investments");
  revalidatePath("/dashboard");
}

"use server";
import { revalidatePath } from "next/cache";
import { readSheet, appendRow, writeSheet } from "@/lib/sheets";
import { parseNum, isoToAppDate } from "@/lib/utils";

function applyBalance(
  accounts: Record<string, string>[],
  compte: string,
  type: string,
  montant: number,
  direction: 1 | -1  // 1 = apply, -1 = reverse
) {
  if (type === "Transfert") return; // Transferts handled separately
  const idx = accounts.findIndex((a) => a["Banque"] === compte);
  if (idx === -1) return;
  const delta = (type === "Revenu" ? montant : -montant) * direction;
  accounts[idx]["Solde_Initial"] = (parseNum(accounts[idx]["Solde_Initial"]) + delta).toString();
}

export async function updateTransaction(
  rowIdx: number,
  data: { date: string; libelle: string; montant: string; categorie: string; compte: string; type: string }
) {
  const [allTx, accounts] = await Promise.all([readSheet("Transactions"), readSheet("Comptes")]);
  if (rowIdx < 0 || rowIdx >= allTx.length) return { error: "Ligne introuvable" };

  const old = allTx[rowIdx];
  // Reverse old balance impact
  applyBalance(accounts, old["Compte_Source"], old["Type"], parseNum(old["Montant"]), -1);
  // Apply new balance impact
  applyBalance(accounts, data.compte, data.type, parseNum(data.montant), 1);

  allTx[rowIdx] = {
    ...old,
    Date: data.date,
    "Libellé": data.libelle,
    Montant: data.montant,
    "Catégorie": data.categorie,
    Compte_Source: data.compte,
    Type: data.type,
  };

  await Promise.all([writeSheet("Transactions", allTx), writeSheet("Comptes", accounts)]);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function deleteTransaction(rowIdx: number) {
  const [allTx, accounts] = await Promise.all([readSheet("Transactions"), readSheet("Comptes")]);
  if (rowIdx < 0 || rowIdx >= allTx.length) return { error: "Ligne introuvable" };

  const old = allTx[rowIdx];
  applyBalance(accounts, old["Compte_Source"], old["Type"], parseNum(old["Montant"]), -1);

  const newTx = allTx.filter((_, i) => i !== rowIdx);
  await Promise.all([writeSheet("Transactions", newTx), writeSheet("Comptes", accounts)]);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function addTransaction(formData: FormData) {
  const type = formData.get("type") as string;
  const compte = formData.get("compte") as string;
  const date = formData.get("date") as string;
  const categorie = formData.get("categorie") as string;
  const libelle = (formData.get("libelle") as string).trim();
  const montant = parseNum(formData.get("montant") as string);

  if (!libelle || montant <= 0) return { error: "Champs invalides" };

  await appendRow("Transactions", {
    Date: date,
    "Libellé": libelle,
    Montant: montant.toString(),
    "Catégorie": categorie,
    Compte_Source: compte,
    Statut: "Validé",
    Type: type,
  });

  const accounts = await readSheet("Comptes");
  const idx = accounts.findIndex((a) => a["Banque"] === compte);
  if (idx !== -1) {
    const delta = type === "Revenu" ? montant : -montant;
    accounts[idx]["Solde_Initial"] = (parseNum(accounts[idx]["Solde_Initial"]) + delta).toString();
    await writeSheet("Comptes", accounts);
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function addTransfer(formData: FormData) {
  const source = formData.get("source") as string;
  const dest = formData.get("dest") as string;
  const montant = parseNum(formData.get("montant") as string);
  const date = formData.get("date") as string;

  if (source === dest || montant <= 0) return { error: "Données invalides" };

  const accounts = await readSheet("Comptes");
  const iSrc = accounts.findIndex((a) => a["Banque"] === source);
  const iDst = accounts.findIndex((a) => a["Banque"] === dest);
  if (iSrc === -1 || iDst === -1) return { error: "Compte introuvable" };

  accounts[iSrc]["Solde_Initial"] = (parseNum(accounts[iSrc]["Solde_Initial"]) - montant).toString();
  accounts[iDst]["Solde_Initial"] = (parseNum(accounts[iDst]["Solde_Initial"]) + montant).toString();
  await writeSheet("Comptes", accounts);

  // Both rows go to the same sheet — keep sequential to avoid interleave
  await appendRow("Transactions", {
    Date: date, "Libellé": `Virement -> ${dest}`, Montant: montant.toString(),
    "Catégorie": "Transfert", Compte_Source: source, Statut: "Validé", Type: "Transfert",
  });
  await appendRow("Transactions", {
    Date: date, "Libellé": `Virement <- ${source}`, Montant: montant.toString(),
    "Catégorie": "Transfert", Compte_Source: dest, Statut: "Validé", Type: "Transfert",
  });

  revalidatePath("/accounts");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function importRevolutRow(formData: FormData) {
  const type = formData.get("type") as string;
  const compte = formData.get("compte") as string;
  const date = formData.get("date") as string;
  const categorie = formData.get("categorie") as string;
  const libelle = formData.get("libelle") as string;
  const montant = Math.abs(parseNum(formData.get("montant") as string));
  const montantRaw = parseNum(formData.get("montantRaw") as string);

  await appendRow("Transactions", {
    Date: date, "Libellé": libelle, Montant: montant.toString(),
    "Catégorie": categorie, Compte_Source: compte, Statut: "Validé", Type: type,
  });

  const accounts = await readSheet("Comptes");
  const idx = accounts.findIndex((a) => a["Banque"] === compte);
  if (idx !== -1) {
    accounts[idx]["Solde_Initial"] = (parseNum(accounts[idx]["Solde_Initial"]) + montantRaw).toString();
    await writeSheet("Comptes", accounts);
  }

  revalidatePath("/expenses");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

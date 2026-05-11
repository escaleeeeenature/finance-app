"use server";
import { revalidatePath } from "next/cache";
import { readSheet, appendRow, writeSheet } from "@/lib/sheets";
import { parseNum } from "@/lib/utils";

export async function addAccount(formData: FormData) {
  const banque = formData.get("banque") as string;
  const iban = formData.get("iban") as string;
  const type = formData.get("type") as string;
  const solde = formData.get("solde") as string;
  const couleur = formData.get("couleur") as string;

  if (!banque) return { error: "Nom requis" };

  await appendRow("Comptes", {
    Banque: banque, IBAN: iban, Type: type,
    Solde_Initial: solde || "0", Statut: "Actif", Couleur_Graphique: couleur || "#6366f1",
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function updateAccount(formData: FormData) {
  const originalName = formData.get("originalName") as string;
  const banque = formData.get("banque") as string;
  const iban = formData.get("iban") as string;
  const type = formData.get("type") as string;
  const solde = formData.get("solde") as string;
  const couleur = formData.get("couleur") as string;
  const statut = formData.get("statut") as string;

  const accounts = await readSheet("Comptes");
  const idx = accounts.findIndex((a) => a["Banque"] === originalName);
  if (idx === -1) return { error: "Compte introuvable" };

  accounts[idx] = { ...accounts[idx], Banque: banque, IBAN: iban, Type: type, Solde_Initial: solde, Couleur_Graphique: couleur, Statut: statut };
  await writeSheet("Comptes", accounts);

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteAccount(banque: string) {
  const accounts = await readSheet("Comptes");
  const filtered = accounts.filter((a) => a["Banque"] !== banque);
  await writeSheet("Comptes", filtered);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

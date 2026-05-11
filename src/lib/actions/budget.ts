"use server";
import { revalidatePath } from "next/cache";
import { readSheet, appendRow, writeSheet } from "@/lib/sheets";

function revalidateAll() {
  revalidatePath("/budget");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function addBudgetLine(formData: FormData) {
  const mois = formData.get("mois") as string;
  const categorie = (formData.get("categorie") as string).trim();
  const type = formData.get("type") as string;
  const montant = formData.get("montant") as string;

  if (!categorie || !mois) return { error: "Champs requis manquants" };

  await appendRow("Budgets", {
    Mois: mois, "Catégorie": categorie, Type: type, Montant_Prevu: montant || "0",
  });

  revalidateAll();
}

export async function updateBudgetLine(formData: FormData) {
  const mois = formData.get("mois") as string;
  const categorie = formData.get("categorie") as string;
  const montant = formData.get("montant") as string;

  const budget = await readSheet("Budgets");
  const idx = budget.findIndex((r) => r["Mois"] === mois && r["Catégorie"] === categorie);
  if (idx !== -1) {
    budget[idx]["Montant_Prevu"] = montant;
    await writeSheet("Budgets", budget);
  }

  revalidateAll();
}

export async function deleteBudgetLine(mois: string, categorie: string) {
  const budget = await readSheet("Budgets");
  const filtered = budget.filter((r) => !(r["Mois"] === mois && r["Catégorie"] === categorie));
  await writeSheet("Budgets", filtered);
  revalidateAll();
}

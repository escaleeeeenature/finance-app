"use server";
import { revalidatePath } from "next/cache";
import { readSheet, appendRow, writeSheet } from "@/lib/sheets";
import { parseNum, toMoisStr, isoToAppDate } from "@/lib/utils";

function revalidateAll() {
  revalidatePath("/enveloppes");
  revalidatePath("/dashboard");
}

export async function addEnvelope(formData: FormData) {
  const nom = (formData.get("nom") as string).trim();
  if (!nom) return { error: "Nom requis" };

  const date_butoir = formData.get("date_butoir") as string;

  await appendRow("Enveloppes", {
    id: Date.now().toString(36),
    nom,
    compte_lie: formData.get("compte_lie") as string,
    couleur: formData.get("couleur") as string || "#6366f1",
    montant_actuel: "0",
    objectif: formData.get("objectif") as string || "0",
    date_butoir: date_butoir ? isoToAppDate(date_butoir) : "",
    contribution_mensuelle: formData.get("contribution_mensuelle") as string || "0",
    ordre: "0",
    actif: "true",
  });

  revalidateAll();
}

export async function updateEnvelope(formData: FormData) {
  const id = formData.get("id") as string;
  const envelopes = await readSheet("Enveloppes");
  const idx = envelopes.findIndex((e) => e["id"] === id);
  if (idx === -1) return { error: "Enveloppe introuvable" };

  const fields: Record<string, string> = {
    nom: (formData.get("nom") as string).trim(),
    couleur: formData.get("couleur") as string,
    montant_actuel: formData.get("montant_actuel") as string,
    objectif: formData.get("objectif") as string,
    contribution_mensuelle: formData.get("contribution_mensuelle") as string,
  };
  const rawDate = formData.get("date_butoir") as string;
  fields.date_butoir = rawDate ? isoToAppDate(rawDate) : "";

  Object.entries(fields).forEach(([k, v]) => {
    if (v !== null && v !== undefined) envelopes[idx][k] = v;
  });

  await writeSheet("Enveloppes", envelopes);
  revalidateAll();
}

export async function deleteEnvelope(id: string) {
  const envelopes = await readSheet("Enveloppes");
  await writeSheet("Enveloppes", envelopes.filter((e) => e["id"] !== id));
  revalidateAll();
}

export async function recordMonthlyTransfer(
  transfers: { id: string; montant: number; note: string }[],
  mois: string
) {
  const active = transfers.filter((t) => t.montant !== 0);
  if (active.length === 0) return;

  const now = new Date();
  const date = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

  // Update all envelope balances in one write
  const envelopes = await readSheet("Enveloppes");
  for (const t of active) {
    const idx = envelopes.findIndex((e) => e["id"] === t.id);
    if (idx !== -1) {
      envelopes[idx]["montant_actuel"] = (
        parseNum(envelopes[idx]["montant_actuel"]) + t.montant
      ).toString();
    }
  }
  await writeSheet("Enveloppes", envelopes);

  // Append one transfer row per envelope
  for (const t of active) {
    await appendRow("Virements_enveloppes", {
      date,
      enveloppe_id: t.id,
      montant: t.montant.toString(),
      note: t.note || "",
      mois,
    });
  }

  revalidateAll();
}

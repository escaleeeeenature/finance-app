"use server";
import * as XLSX from "xlsx";
import { appendRow, readSheet } from "@/lib/sheets";
import { revalidatePath } from "next/cache";

export type ParsedInvestRow = {
  ordre: string;
  date: string;
  type: "Achat" | "Vente";
  symbole: string;
  nom: string;
  isin: string;
  quantite: number;
  prixUnitaire: number;
  frais: number;
  devise: string;
  classe: string;
  duplicate: boolean;
};

export type ParsedFraisRow = {
  date: string;
  type: string;
  montant: number;
  devise: string;
  description: string;
  duplicate: boolean;
};

export type ParsedDividendeRow = {
  date: string;
  symbole: string;
  nom: string;
  montant: number;
  devise: string;
  ordre: string;
  duplicate: boolean;
};

// French month abbreviations → numeric
// Excel auto-formats small decimals as dates: "mai.90" → 5.90
function parseSwissNum(val: unknown): number {
  if (typeof val === "number") return Math.abs(val);
  if (typeof val === "string") {
    const months: Record<string, string> = {
      "janv": "1", "févr": "2", "mars": "3", "avr": "4",
      "mai": "5", "juin": "6", "juil": "7", "août": "8",
      "sept": "9", "oct": "10", "nov": "11", "déc": "12",
    };
    let s = val.trim().toLowerCase();
    for (const [m, n] of Object.entries(months)) {
      s = s.replace(m + ".", n + ".");
    }
    return Math.abs(parseFloat(s) || 0);
  }
  return 0;
}

function parseSwissDate(val: unknown): string {
  const s = String(val ?? "").trim();
  const datePart = s.split(" ")[0];
  const parts = datePart.split(".");
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`;
  return s;
}

const FEE_TYPES = ["droits de garde", "rectif. frais de", "frais"];

export async function parseSwissquoteFile(
  formData: FormData
): Promise<{
  invest?: ParsedInvestRow[];
  frais?: ParsedFraisRow[];
  dividendes?: ParsedDividendeRow[];
  error?: string;
}> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Fichier manquant" };

  let rawRows: unknown[][];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", raw: true, cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  } catch {
    return { error: "Impossible de lire le fichier (.xlsx ou .csv uniquement)" };
  }

  if (rawRows.length < 2) return { error: "Fichier vide ou format non reconnu" };

  // Find header row
  let headerIdx = -1;
  const colMap: Record<string, number> = {};
  for (let i = 0; i < Math.min(5, rawRows.length); i++) {
    const row = rawRows[i] as string[];
    const found = row.findIndex((c) => String(c).toLowerCase().includes("transaction"));
    if (found !== -1) {
      headerIdx = i;
      row.forEach((h, idx) => { colMap[String(h).toLowerCase().trim()] = idx; });
      break;
    }
  }
  if (headerIdx === -1) return { error: "Format non reconnu. Colonne 'Transaction' introuvable." };

  // Load existing data for duplicate detection
  const [existingInvest, existingFrais, existingDivs] = await Promise.all([
    readSheet("Invest_Transactions"),
    readSheet("Frais_Courtier"),
    readSheet("Dividendes"),
  ]);
  const existingOrdres = new Set(existingInvest.map((r) => r["ordre"] || "").filter(Boolean));
  // Fees dedup: date+type+montant
  const existingFraisKeys = new Set(
    existingFrais.map((r) => `${r["date"]}|${r["type"]}|${r["montant"]}`)
  );
  // Dividends dedup: date+symbole
  const existingDivKeys = new Set(
    existingDivs.map((r) => `${r["date"]}|${r["symbole"]}`)
  );

  const get = (row: unknown[], col: string): string =>
    String((row as unknown[])[colMap[col] ?? -1] ?? "").trim();

  const invest: ParsedInvestRow[] = [];
  const frais: ParsedFraisRow[] = [];
  const dividendes: ParsedDividendeRow[] = [];

  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i] as unknown[];
    const type = get(row, "transaction").toLowerCase();
    const date = parseSwissDate(get(row, "date"));
    const devise = get(row, "devise");
    const ordre = get(row, "ordre #") || get(row, "ordre");
    const montantNet = parseSwissNum(get(row, "montant net"));

    // ── Achat / Vente ────────────────────────────────────────────
    if (type === "achat" || type === "vente") {
      const symbole = get(row, "symbole");
      if (!symbole) continue;
      invest.push({
        ordre,
        date,
        type: type === "achat" ? "Achat" : "Vente",
        symbole,
        nom: get(row, "nom"),
        isin: get(row, "isin"),
        quantite: parseSwissNum(get(row, "quantité") || get(row, "quantite")),
        prixUnitaire: parseSwissNum(get(row, "prix unitaire")),
        frais: parseSwissNum(get(row, "coûts") || get(row, "couts")),
        devise,
        classe: "ETF",
        duplicate: ordre ? existingOrdres.has(ordre) : false,
      });
      continue;
    }

    // ── Droits de Garde & frais ──────────────────────────────────
    if (FEE_TYPES.some((f) => type.includes(f))) {
      const montant = montantNet > 0 ? montantNet : parseSwissNum(get(row, "prix unitaire"));
      const key = `${date}|${type}|${montant}`;
      frais.push({
        date,
        type: "Droits de Garde",
        montant,
        devise,
        description: get(row, "nom") || type,
        duplicate: existingFraisKeys.has(key),
      });
      continue;
    }

    // ── Dividendes ───────────────────────────────────────────────
    if (type === "dividende") {
      const symbole = get(row, "symbole");
      const key = `${date}|${symbole}`;
      dividendes.push({
        date,
        symbole,
        nom: get(row, "nom"),
        montant: montantNet,
        devise,
        ordre,
        duplicate: existingDivKeys.has(key),
      });
      continue;
    }
  }

  const total = invest.length + frais.length + dividendes.length;
  if (total === 0) return { error: "Aucune transaction reconnue dans ce fichier." };

  return { invest, frais, dividendes };
}

export async function confirmImport(
  invest: ParsedInvestRow[],
  frais: ParsedFraisRow[],
  dividendes: ParsedDividendeRow[]
): Promise<{ imported?: number; error?: string }> {
  let count = 0;

  for (const r of invest.filter((r) => !r.duplicate)) {
    await appendRow("Invest_Transactions", {
      date: r.date,
      Type: r.type,
      Symbole: r.symbole,
      Quantité: r.quantite.toString(),
      Prix_Unitaire: r.prixUnitaire.toString(),
      Frais: r.frais.toString(),
      Classe: r.classe,
      ordre: r.ordre,
    });
    count++;
  }

  for (const r of frais.filter((r) => !r.duplicate)) {
    await appendRow("Frais_Courtier", {
      date: r.date,
      type: r.type,
      montant: r.montant.toString(),
      devise: r.devise,
      description: r.description,
    });
    count++;
  }

  for (const r of dividendes.filter((r) => !r.duplicate)) {
    await appendRow("Dividendes", {
      date: r.date,
      symbole: r.symbole,
      nom: r.nom,
      montant: r.montant.toString(),
      devise: r.devise,
      ordre: r.ordre,
    });
    count++;
  }

  if (count === 0) return { error: "Aucune nouvelle ligne à importer" };

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { imported: count };
}

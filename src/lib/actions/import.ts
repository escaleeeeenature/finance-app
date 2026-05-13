"use server";
import * as XLSX from "xlsx";
import { appendRow, readSheet } from "@/lib/sheets";
import { revalidatePath } from "next/cache";

export type ParsedInvestRow = {
  ordre: string;
  date: string;        // dd/mm/yyyy
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

// French month abbreviations → numeric (Excel auto-formats small decimals as dates)
// e.g. "mai.90" → 5.90, "août.70" → 8.70
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
  // Expected: "28.10.2025 09:20" → "28/10/2025"
  const s = String(val ?? "").trim();
  const datePart = s.split(" ")[0]; // take "28.10.2025"
  const parts = datePart.split(".");
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`;
  return s;
}

export async function parseSwissquoteFile(
  formData: FormData
): Promise<{ rows?: ParsedInvestRow[]; error?: string }> {
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

  // Find header row (contains "Transaction")
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

  // Read existing transactions for duplicate detection
  const existing = await readSheet("Invest_Transactions");
  const existingOrdres = new Set(existing.map((r) => r["ordre"] || "").filter(Boolean));

  const get = (row: unknown[], col: string): string =>
    String((row as unknown[])[colMap[col] ?? -1] ?? "").trim();

  const parsed: ParsedInvestRow[] = [];
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i] as unknown[];
    const type = get(row, "transaction");
    if (type !== "Achat" && type !== "Vente") continue;
    const symbole = get(row, "symbole");
    if (!symbole) continue;

    const ordre = get(row, "ordre #") || get(row, "ordre");
    const duplicate = ordre ? existingOrdres.has(ordre) : false;

    parsed.push({
      ordre,
      date: parseSwissDate(get(row, "date")),
      type: type as "Achat" | "Vente",
      symbole,
      nom: get(row, "nom"),
      isin: get(row, "isin"),
      quantite: parseSwissNum(get(row, "quantité") || get(row, "quantite")),
      prixUnitaire: parseSwissNum(get(row, "prix unitaire")),
      frais: parseSwissNum(get(row, "coûts") || get(row, "couts")),
      devise: get(row, "devise"),
      classe: "ETF",
      duplicate,
    });
  }

  if (parsed.length === 0) return { error: "Aucune transaction Achat/Vente trouvée dans ce fichier." };
  return { rows: parsed };
}

export async function confirmImport(rows: ParsedInvestRow[]): Promise<{ imported?: number; error?: string }> {
  const toImport = rows.filter((r) => !r.duplicate);
  if (toImport.length === 0) return { error: "Aucune nouvelle ligne à importer" };

  for (const r of toImport) {
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
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { imported: toImport.length };
}

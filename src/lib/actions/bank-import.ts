"use server";
import { readSheet, appendRow, writeSheet } from "@/lib/sheets";
import { parseNum } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export type ParsedBankRow = {
  id: string;             // unique key for dedup UI
  date: string;           // dd/mm/yyyy
  libelle: string;
  montant: number;        // positive = revenu, negative = dépense
  type: "Dépense" | "Revenu";
  categorie: string;      // suggested category
  source: string;         // bank name
  duplicate: boolean;
  skip: boolean;          // internal transfers etc.
  skipReason?: string;
};

// ── Auto-categorization ──────────────────────────────────────────────────────
const CATEGORY_RULES: { keywords: string[]; cat: string }[] = [
  { keywords: ["migros", "coop", "denner", "lidl", "aldi", "volg", "spar", "manor food", "k-kiosk", "relay"], cat: "Alimentation" },
  { keywords: ["sbb", "cff", "ffs", "tpg", "bus ", "tram", "metro", "grab", "taxi", "uber", "bls", "fairtiq"], cat: "Transport" },
  { keywords: ["restaurant", "café", "bar", "bistro", "brasserie", "pizza", "sushi", "burger", "kebab", "hay bar", "high bar", "mad monkey", "quiri"], cat: "Restaurants & Bars" },
  { keywords: ["hotel", "hostel", "airbnb", "booking.com", "hébergement", "b&b"], cat: "Hébergement" },
  { keywords: ["netflix", "spotify", "apple", "google play", "amazon", "disney+", "youtube premium"], cat: "Abonnements" },
  { keywords: ["pharmacie", "apotheke", "médecin", "dentiste", "hôpital", "doctor", "clinic", "health"], cat: "Santé" },
  { keywords: ["loyer", "rent", "hypothèque", "genossenschaft"], cat: "Loyer" },
  { keywords: ["change en", "changes en"], cat: "Voyage" },
  { keywords: ["lagardère", "duty free", "aéroport", "airport", "acv noi bai", "noi bai", "fly", "swiss air", "easyjet", "air"], cat: "Voyage" },
  { keywords: ["saily", "esim", "swisscom", "sunrise", "salt ", "yallo"], cat: "Téléphonie" },
  { keywords: ["uniqlo", "zara", "h&m", "zalando", "vêtement", "clothing", "shoes", "era 48"], cat: "Vêtements" },
  { keywords: ["salaire", "salary", "lohn", "virement de :"], cat: "Salaire" },
  { keywords: ["assurance", "insurance", "css", "helsana", "swica", "visana"], cat: "Assurances" },
  { keywords: ["electricity", "gas", "eau ", "energie", "swissgas", "romande energie"], cat: "Charges" },
];

function suggestCategory(libelle: string): string {
  const l = libelle.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => l.includes(kw))) return rule.cat;
  }
  return "Autre";
}

// ── Revolut CSV parser ────────────────────────────────────────────────────────
// Columns: Type,Produit,Date de début,Date de fin,Description,Montant,Frais,Devise,État,Solde
function parseRevolutDate(s: string): string {
  // "2026-07-20 16:01:03" → "20/07/2026"
  const d = (s || "").split(" ")[0].split("-");
  if (d.length === 3) return `${d[2]}/${d[1]}/${d[0]}`;
  return s;
}

export async function parseRevolutFile(formData: FormData): Promise<{
  rows?: ParsedBankRow[];
  soldeCalcule?: number;
  error?: string;
}> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Fichier manquant" };

  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { error: "Fichier vide" };

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const col = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const iType   = col("Type");
  const iDateFin = col("Date de fin");
  const iDateDeb = col("Date de début");
  const iDesc   = col("Description");
  const iMontant = col("Montant");
  const iDevise  = col("Devise");
  const iEtat    = col("État");
  const iSolde   = col("Solde");

  if (iType === -1 || iDesc === -1) return { error: "Format Revolut non reconnu (colonnes manquantes)" };

  // Load existing transactions for duplicate detection
  const existing = await readSheet("Transactions");
  const existingKeys = new Set(
    existing.map((r) => `${r["Date"]}|${r["Libellé"]}|${r["Montant"]}`)
  );

  const rows: ParsedBankRow[] = [];
  let soldeCalcule: number | undefined;

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 5) continue;

    const type    = cells[iType] ?? "";
    const etat    = cells[iEtat] ?? "";
    const devise  = cells[iDevise] ?? "";
    const montant = parseFloat(cells[iMontant] ?? "0") || 0;
    const libelle = cells[iDesc] ?? "";
    const soldeStr = iSolde !== -1 ? cells[iSolde] : "";
    if (soldeStr) {
      const s = parseFloat(soldeStr);
      if (!isNaN(s)) soldeCalcule = s;
    }

    // Skip failed/pending
    if (etat === "RENVOYÉ" || etat === "EN ATTENTE") continue;

    // Skip non-CHF (Vietnam VND transactions — already captured via Changes CHF→VND)
    if (devise !== "CHF") continue;

    // Use settlement date, fallback to start date
    const dateRaw = cells[iDateFin] || cells[iDateDeb] || "";
    const date = parseRevolutDate(dateRaw);

    const id = `${date}|${libelle}|${montant}`;

    // ── Skip rules ─────────────────────────────────────────────────────────
    // "Ajout de fonds" = rechargement depuis ta banque principale → skip (double comptage)
    if (type === "Ajout de fonds") {
      rows.push({
        id, date, libelle, montant, type: "Revenu", categorie: "Virement interne",
        source: "Revolut", duplicate: existingKeys.has(id), skip: true,
        skipReason: "Rechargement depuis banque principale (évite le double comptage)",
      });
      continue;
    }

    // "Changes" positif CHF = récupération de devises → skip
    if (type === "Changes" && montant > 0) {
      rows.push({
        id, date, libelle: `${libelle}`, montant, type: "Revenu", categorie: "Change retour",
        source: "Revolut", duplicate: existingKeys.has(id), skip: true,
        skipReason: "Retour de change (interne)",
      });
      continue;
    }

    // "Changes" négatif = argent converti en devises étrangères → Dépense Voyage
    if (type === "Changes" && montant < 0) {
      const cat = "Voyage";
      rows.push({
        id, date, libelle, montant, type: "Dépense", categorie: cat,
        source: "Revolut", duplicate: existingKeys.has(id), skip: false,
      });
      continue;
    }

    // Regular card payments and transfers
    const txType: "Dépense" | "Revenu" = montant < 0 ? "Dépense" : "Revenu";
    const cat = suggestCategory(libelle);

    rows.push({
      id, date, libelle, montant, type: txType, categorie: cat,
      source: "Revolut", duplicate: existingKeys.has(id), skip: false,
    });
  }

  if (rows.length === 0) return { error: "Aucune transaction CHF trouvée dans ce fichier." };

  return { rows, soldeCalcule };
}

// ── BCJ Excel (manual) parser ─────────────────────────────────────────────────
// Expected columns: Date (dd/mm/yyyy), Libellé, Montant (neg=dépense), Type (opt)

export async function parseBCJExcelFile(formData: FormData): Promise<{
  rows?: ParsedBankRow[];
  soldeCalcule?: number;
  error?: string;
}> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Fichier manquant" };

  let rows2d: string[][];
  try {
    const XLSX = await import("xlsx");
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows2d = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
  } catch {
    return { error: "Impossible de lire ce fichier Excel." };
  }

  if (rows2d.length < 2) return { error: "Fichier vide ou format incorrect." };

  // Detect header row
  const header = rows2d[0].map((h) => String(h).toLowerCase().trim());
  const iDate    = header.findIndex((h) => h.includes("date"));
  const iLibelle = header.findIndex((h) => h.includes("libel") || h.includes("description") || h.includes("désignation"));
  const iMontant = header.findIndex((h) => h.includes("montant") || h.includes("amount"));
  const iType    = header.findIndex((h) => h === "type");

  if (iDate === -1 || iLibelle === -1 || iMontant === -1) {
    return { error: "Colonnes manquantes. Le fichier doit avoir : Date, Libellé, Montant." };
  }

  const existing = await readSheet("Transactions");
  const existingKeys = new Set(
    existing.map((r) => `${r["Date"]}|${r["Libellé"]}|${r["Montant"]}`)
  );

  const rows: ParsedBankRow[] = [];

  for (let i = 1; i < rows2d.length; i++) {
    const row = rows2d[i];
    const dateRaw = String(row[iDate] ?? "").trim();
    const libelle = String(row[iLibelle] ?? "").trim();
    const montantRaw = String(row[iMontant] ?? "").trim().replace(",", ".");
    if (!dateRaw || !libelle || !montantRaw) continue;

    // Normalize date to dd/mm/yyyy
    let date = dateRaw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split("-");
      date = `${d}/${m}/${y}`;
    } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
      date = date.replace(/\./g, "/");
    } else if (/^\d{2}\.\d{2}\.\d{2}$/.test(date)) {
      const [d, m, y] = date.split(".");
      date = `${d}/${m}/20${y}`;
    }
    // If already dd/mm/yyyy, keep as-is

    const montant = parseFloat(montantRaw) || 0;
    if (montant === 0) continue;

    const typeHint = iType !== -1 ? String(row[iType] ?? "").trim() : "";
    const type: "Dépense" | "Revenu" = typeHint === "Revenu" || montant > 0 ? "Revenu" : "Dépense";
    const finalMontant = type === "Revenu" ? Math.abs(montant) : -Math.abs(montant);
    const categorie = suggestCategory(libelle);
    const id = `${date}|${libelle}|${Math.abs(montant)}`;

    rows.push({
      id, date, libelle, montant: finalMontant, type, categorie,
      source: "BCJ Manuel", duplicate: existingKeys.has(id), skip: false,
    });
  }

  if (rows.length === 0) return { error: "Aucune transaction trouvée dans ce fichier." };
  return { rows, soldeCalcule: undefined };
}

// ── BCJ PDF parser ────────────────────────────────────────────────────────────

const BCJ_LINE_RE = /^(\d{2}\.\d{2}\.\d{2})\s+(.+)/;

function parseBCJDate(s: string): string {
  const p = s.split(".");
  return p.length === 3 ? `${p[0]}/${p[1]}/20${p[2]}` : s;
}

function parseSwissNum(s: string): number {
  return parseFloat(s.replace(/'/g, "")) || 0;
}

function classifyBCJLine(line: string): "debit" | "credit" | "unknown" {
  const l = line.toLowerCase();
  if (l.includes("crédit twint") || l.includes("credit twint")) return "credit";
  if (l.includes("virement de")) return "credit";
  if (l.includes("débit twint") || l.includes("debit twint")) return "debit";
  if (l.includes("paiement")) return "debit";
  if (l.includes("dmc-tancomat")) return "debit";
  if (l.includes("retrait bancomat")) return "debit";
  if (l.includes("bcj mobile banking")) return "debit";
  if (l.includes("virement à") || l.includes("virement a :")) return "debit";
  return "unknown";
}

function extractBCJLibelle(firstLine: string, valueDateStr: string): string {
  let s = firstLine.replace(/^\d{2}\.\d{2}\.\d{2}\s+/, "");
  // Remove type prefix + optional detail datetime
  s = s.replace(/^(Paiement|DMC-Tancomat|Retrait bancomat)\s+\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s*/i, "");
  s = s.replace(/^(Débit TWINT|Crédit TWINT|BCJ Mobile Banking)\s*/i, "");
  s = s.replace(/^Virement (de|à)\s*:\s*/i, "");
  // Trim from value date to end
  const idx = s.lastIndexOf(valueDateStr);
  if (idx !== -1) s = s.substring(0, idx);
  // Remove trailing phone numbers and punctuation
  s = s.replace(/,?\s*\+\d{8,}$/, "").trim().replace(/[,\s]+$/, "").trim();
  return s || "—";
}

export async function parseBCJFile(formData: FormData): Promise<{
  rows?: ParsedBankRow[];
  soldeCalcule?: number;
  error?: string;
}> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Fichier manquant" };

  let text: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (b: Buffer) => Promise<{ text: string }>;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);
    text = result.text;
  } catch {
    return { error: "Impossible de lire ce PDF. Vérifiez qu'il s'agit bien d'un relevé BCJ." };
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Locate header
  const headerIdx = lines.findIndex((l) => l.includes("Débit") && l.includes("Solde CHF"));
  if (headerIdx === -1) return { error: "Format BCJ non reconnu — en-tête non trouvé." };

  // Starting balance from "Report XXXXX" line
  let lastBalance = 0;
  const reportLine = lines.slice(headerIdx).find((l) => /^Report\s+[\d']+\.\d{2}/.test(l));
  if (reportLine) {
    const m = reportLine.match(/[\d']+\.\d{2}/);
    if (m) lastBalance = parseSwissNum(m[0]);
  }

  // Build transaction blocks (each starts with DD.MM.YY)
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    if (BCJ_LINE_RE.test(line) && !/^Report/.test(line)) {
      if (current.length) blocks.push(current);
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  // Existing transactions for duplicate detection
  const existing = await readSheet("Transactions");
  const existingKeys = new Set(
    existing.map((r) => `${r["Date"]}|${r["Libellé"]}|${r["Montant"]}`)
  );

  const rows: ParsedBankRow[] = [];

  for (const block of blocks) {
    const firstLine = block[0];
    if (!BCJ_LINE_RE.test(firstLine)) continue;

    const accountingDateRaw = firstLine.match(/^(\d{2}\.\d{2}\.\d{2})/)?.[1];
    if (!accountingDateRaw) continue;
    const date = parseBCJDate(accountingDateRaw);

    // All 2-digit-year dates in first line → last one is value date
    const allDates = [...firstLine.matchAll(/\b(\d{2}\.\d{2}\.\d{2})\b/g)];
    if (allDates.length < 2) continue;
    const valueDateStr = allDates[allDates.length - 1][1];
    const afterValueDate = firstLine.substring(firstLine.lastIndexOf(valueDateStr) + valueDateStr.length).trim();

    // Amounts after value date: no-apostrophe = transaction, with-apostrophe = balance
    const amtMatches = [...afterValueDate.matchAll(/[\d']+\.\d{2}/g)];
    if (amtMatches.length === 0) continue;

    let amount = 0;
    let balance: number | undefined;
    for (const m of amtMatches) {
      if (!m[0].includes("'") && amount === 0) amount = parseSwissNum(m[0]);
      else if (m[0].includes("'")) balance = parseSwissNum(m[0]);
    }

    // If no balance on first line, check last continuation line
    if (balance === undefined && block.length > 1) {
      const lastLine = block[block.length - 1];
      const lastAmts = [...lastLine.matchAll(/[\d']+\.\d{2}/g)].filter((m) => m[0].includes("'"));
      if (lastAmts.length) balance = parseSwissNum(lastAmts[lastAmts.length - 1][0]);
    }

    if (amount === 0) continue;

    let direction = classifyBCJLine(firstLine);
    // Infer from balance delta if unknown
    if (direction === "unknown" && balance !== undefined) {
      direction = balance < lastBalance ? "debit" : "credit";
    }
    if (balance !== undefined) lastBalance = balance;

    const libelle = extractBCJLibelle(firstLine, valueDateStr);
    const montant = direction === "credit" ? amount : -amount;
    const type: "Dépense" | "Revenu" = direction === "credit" ? "Revenu" : "Dépense";
    const categorie = suggestCategory(libelle);
    const id = `${date}|${libelle}|${amount}`;

    // Skip internal transfers to Revolut (balance already handled via soldeCalcule)
    const isRevolutTransfer = direction === "debit" &&
      (libelle.toLowerCase().includes("revolut") || firstLine.toLowerCase().includes("revolut"));

    rows.push({
      id, date, libelle, montant, type, categorie,
      source: "BCJ", duplicate: existingKeys.has(id),
      skip: isRevolutTransfer,
      skipReason: isRevolutTransfer ? "Virement interne vers Revolut" : undefined,
    });
  }

  if (rows.length === 0) return { error: "Aucune transaction trouvée dans ce PDF BCJ." };
  return { rows, soldeCalcule: lastBalance };
}

// ── Confirm bank import ──────────────────────────────────────────────────────
export async function confirmBankImport(
  rows: Pick<ParsedBankRow, "date" | "libelle" | "montant" | "type" | "categorie" | "skip" | "duplicate">[],
  accountName: string,
  newBalance?: number
) {
  const toImport = rows.filter((r) => !r.skip && !r.duplicate);

  // Append transactions
  await Promise.all(
    toImport.map((r) =>
      appendRow("Transactions", {
        Date: r.date,
        "Libellé": r.libelle,
        Montant: Math.abs(r.montant).toString(),
        "Catégorie": r.categorie,
        Compte_Source: accountName,
        Statut: "Validé",
        Type: r.type,
      })
    )
  );

  // Update account balance if provided
  if (newBalance !== undefined && accountName) {
    const accounts = await readSheet("Comptes");
    const idx = accounts.findIndex((a) => a["Banque"] === accountName || a["Nom"] === accountName);
    if (idx !== -1) {
      accounts[idx]["Solde_Initial"] = newBalance.toString();
      await writeSheet("Comptes", accounts);
    }
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/budget");

  return { imported: toImport.length };
}

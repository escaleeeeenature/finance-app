import { google } from "googleapis";
import path from "path";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

function getAuth() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(process.cwd(), "credentials.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function readSheet(sheetName: string): Promise<Record<string, string>[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];
  const headers = rows[0] as string[];
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => { record[h] = (row[i] ?? "") as string; });
    return record;
  });
}

export async function writeSheet(sheetName: string, data: Record<string, string>[]) {
  if (data.length === 0) return;
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const headers = Object.keys(data[0]);
  const rows = [headers, ...data.map((r) => headers.map((h) => r[h] ?? ""))];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

export async function appendRow(sheetName: string, row: Record<string, string>) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // Read headers first to guarantee values land in the correct columns,
  // regardless of the key insertion order of the caller's object.
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });
  const headers = (headerRes.data.values?.[0] as string[] | undefined) ?? Object.keys(row);
  const values = headers.map((h) => row[h] ?? "");

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

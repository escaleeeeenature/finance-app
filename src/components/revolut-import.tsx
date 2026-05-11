"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle } from "lucide-react";
import { importRevolutRow } from "@/lib/actions/transactions";
import { toMoisStr } from "@/lib/utils";

type ParsedRow = {
  date: string; libelle: string; montantRaw: number;
  type: "Dépense" | "Revenu"; moisStr: string;
};

type Sel = { compte: string; cat: string };

function parseCsv(content: string): ParsedRow[] {
  const sep = content.split(";").length > content.split(",").length ? ";" : ",";
  const lines = content.trim().split("\n");
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/"/g, ""));
  const colDesc = headers.find((h) => h.includes("Description") || h.includes("description"));
  const colAmount = headers.find((h) => h.includes("Montant") || h.includes("Amount") || h.includes("amount"));
  const colDate = headers.find((h) => h.includes("Date") || h.includes("date"));
  if (!colDesc || !colAmount) return [];

  return lines.slice(1).flatMap((line) => {
    const vals = line.split(sep).map((v) => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    const rawAmt = parseFloat(row[colAmount].replace(/[' ]/g, ""));
    if (isNaN(rawAmt) || rawAmt === 0) return [];
    let date = new Date();
    if (colDate) { try { date = new Date(row[colDate]); } catch {} }
    if (isNaN(date.getTime())) date = new Date();
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return [{
      date: `${dd}/${mm}/${yyyy}`, libelle: row[colDesc], montantRaw: rawAmt,
      type: rawAmt < 0 ? "Dépense" : "Revenu", moisStr: toMoisStr(date),
    }];
  });
}

export function RevolutImport({
  accounts,
  budgets,
}: {
  accounts: Record<string, string>[];
  budgets: Record<string, string>[];
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [imported, setImported] = useState<Set<number>>(new Set());
  const [selections, setSelections] = useState<Record<number, Sel>>({});
  const [isPending, startTransition] = useTransition();

  const defaultAccount = accounts.find((a) => a["Banque"] === "Revolut")?.["Banque"] ?? accounts[0]?.["Banque"] ?? "";

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const parsed = parseCsv(content);
      setRows(parsed);
      setImported(new Set());
      const init: Record<number, Sel> = {};
      parsed.forEach((r, i) => {
        const cats = budgets.filter((b) => b["Mois"] === r.moisStr && b["Type"] === r.type).map((b) => b["Catégorie"]);
        init[i] = { compte: defaultAccount, cat: cats[0] ?? "" };
      });
      setSelections(init);
    };
    reader.readAsText(file);
  }

  function setCat(i: number, v: string) {
    setSelections((s) => ({ ...s, [i]: { ...s[i], cat: v } }));
  }
  function setCompte(i: number, v: string) {
    setSelections((s) => ({ ...s, [i]: { ...s[i], compte: v } }));
  }

  function importRow(i: number) {
    const r = rows[i];
    const sel = selections[i];
    const formData = new FormData();
    formData.set("type", r.type);
    formData.set("compte", sel.compte);
    formData.set("date", r.date);
    formData.set("categorie", sel.cat);
    formData.set("libelle", r.libelle);
    formData.set("montant", String(Math.abs(r.montantRaw)));
    formData.set("montantRaw", String(r.montantRaw));
    startTransition(async () => {
      await importRevolutRow(formData);
      setImported((prev) => new Set([...prev, i]));
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Upload size={15} /> Import Revolut
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import CSV Revolut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input type="file" accept=".csv" onChange={handleFile} className="text-sm text-slate-600" />
            {rows.length > 0 && (
              <p className="text-sm text-slate-500">{rows.length} transactions détectées</p>
            )}
            <div className="space-y-2">
              {rows.map((r, i) => {
                const cats = budgets
                  .filter((b) => b["Mois"] === r.moisStr && b["Type"] === r.type)
                  .map((b) => b["Catégorie"]);
                const isDep = r.type === "Dépense";
                const done = imported.has(i);
                return (
                  <div key={i} className={`border rounded-lg p-3 text-sm ${done ? "opacity-40" : ""}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-semibold ${isDep ? "text-red-500" : "text-emerald-600"}`}>
                        {isDep ? "-" : "+"}{Math.abs(r.montantRaw).toFixed(2)} CHF
                      </span>
                      <span className="text-slate-400">{r.date}</span>
                      <span className="text-slate-600 flex-1 truncate">{r.libelle}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select value={selections[i]?.cat ?? ""} onValueChange={(v) => { if (v) setCat(i, v); }}>
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="Catégorie..." />
                        </SelectTrigger>
                        <SelectContent>
                          {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={selections[i]?.compte ?? defaultAccount} onValueChange={(v) => { if (v) setCompte(i, v); }}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a["Banque"]} value={a["Banque"]}>{a["Banque"]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" disabled={done || isPending} onClick={() => importRow(i)}
                        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 shrink-0">
                        {done ? <CheckCircle size={14} /> : "Importer"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

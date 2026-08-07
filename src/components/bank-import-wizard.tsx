"use client";
import { useState, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, AlertTriangle, X, Eye, EyeOff, Building2 } from "lucide-react";
import { parseRevolutFile, parseBCJFile, parseBCJExcelFile, confirmBankImport, type ParsedBankRow } from "@/lib/actions/bank-import";

const CATEGORIES = [
  "Alimentation", "Transport", "Restaurants & Bars", "Hébergement", "Voyage",
  "Abonnements", "Santé", "Loyer", "Téléphonie", "Vêtements", "Salaire",
  "Assurances", "Charges", "Investissement", "Virement interne", "Autre",
];

function fmtCHF(n: number) {
  return Math.abs(n).toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BankImportWizard({
  accounts,
  bank = "revolut",
  defaultAccount,
}: {
  accounts: { nom: string }[];
  bank?: "revolut" | "bcj";
  defaultAccount?: string;
}) {
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [rows, setRows] = useState<ParsedBankRow[]>([]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set()); // IDs manually skipped
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [soldeCalcule, setSoldeCalcule] = useState<number | undefined>();
  const [newBalance, setNewBalance] = useState<string>("");
  const [account, setAccount] = useState(defaultAccount ?? accounts[0]?.nom ?? (bank === "revolut" ? "Revolut" : "BCJ"));
  const [showSkipped, setShowSkipped] = useState(false);
  const [error, setError] = useState("");
  const [isParsing, startParse] = useTransition();
  const [isConfirming, startConfirm] = useTransition();
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError("");
    const fd = new FormData();
    fd.set("file", file);
    const name = file.name.toLowerCase();
    const isPDF  = name.endsWith(".pdf");
    const isXLSX = name.endsWith(".xlsx") || name.endsWith(".xls");
    startParse(async () => {
      const res = isPDF ? await parseBCJFile(fd)
        : isXLSX && bank === "bcj" ? await parseBCJExcelFile(fd)
        : await parseRevolutFile(fd);
      if (res.error) { setError(res.error); return; }
      setRows(res.rows ?? []);
      setSoldeCalcule(res.soldeCalcule);
      if (res.soldeCalcule !== undefined) setNewBalance(res.soldeCalcule.toString());
      setCategories(
        Object.fromEntries((res.rows ?? []).map((r) => [r.id, r.categorie]))
      );
      setStep("review");
    });
  }

  function handleConfirm() {
    const toSend = rows.map((r) => ({
      ...r,
      categorie: categories[r.id] ?? r.categorie,
      skip: r.skip || skipped.has(r.id),
    }));
    startConfirm(async () => {
      const res = await confirmBankImport(
        toSend,
        account,
        newBalance ? parseFloat(newBalance) : undefined
      );
      setImportedCount(res.imported);
      setStep("done");
    });
  }

  const visibleRows = rows.filter((r) => !r.skip || showSkipped);
  const activeRows = rows.filter((r) => !r.skip && !skipped.has(r.id) && !r.duplicate);
  const dupRows = rows.filter((r) => !r.skip && r.duplicate);
  const skippedRows = rows.filter((r) => r.skip);
  const manuallySkipped = rows.filter((r) => !r.skip && skipped.has(r.id));

  // ── Upload ──────────────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <input
          ref={fileRef} type="file" accept={bank === "revolut" ? ".csv" : ".pdf,.xlsx,.xls"} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <Upload size={28} className="mx-auto mb-3 text-slate-300" />
        {bank === "revolut" ? (
          <>
            <p className="text-sm font-medium text-slate-600">Glisse ton relevé Revolut ici</p>
            <p className="text-xs text-slate-400 mt-1">Format CSV · App Revolut → Compte → Relevé → Exporter CSV</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-600">Glisse ton relevé BCJ ici</p>
            <p className="text-xs text-slate-400 mt-1">PDF (e-banking BCJ) ou Excel (généré par IA)</p>
          </>
        )}
        {isParsing && <p className="text-xs text-indigo-500 mt-3 animate-pulse">Analyse en cours...</p>}
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="text-center py-8 space-y-2">
        <CheckCircle size={40} className="mx-auto text-emerald-500" />
        <p className="text-lg font-semibold text-slate-800">{importedCount} transactions importées</p>
        <p className="text-xs text-slate-400">Solde du compte {account} mis à jour</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => { setStep("upload"); setRows([]); }}>
          Importer un autre fichier
        </Button>
      </div>
    );
  }

  // ── Review ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex gap-3 flex-wrap text-xs">
        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
          {activeRows.length} à importer
        </span>
        {dupRows.length > 0 && (
          <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
            {dupRows.length} doublons ignorés
          </span>
        )}
        {(skippedRows.length + manuallySkipped.length) > 0 && (
          <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
            {skippedRows.length + manuallySkipped.length} ignorés
          </span>
        )}
        <button
          className="ml-auto text-slate-400 flex items-center gap-1 hover:text-slate-600"
          onClick={() => setShowSkipped((v) => !v)}
        >
          {showSkipped ? <EyeOff size={12} /> : <Eye size={12} />}
          {showSkipped ? "Masquer les ignorés" : "Voir tous"}
        </button>
      </div>

      {/* Account + balance */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl">
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">Compte à créditer</p>
          <Select value={account} onValueChange={(v) => v && setAccount(v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.nom} value={a.nom}>{a.nom}</SelectItem>
              ))}
              <SelectItem value="Revolut">Revolut (nouveau)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {soldeCalcule !== undefined && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-medium">
              Solde final du relevé
              <span className="text-slate-300 ml-1">(calculé: {fmtCHF(soldeCalcule)} CHF)</span>
            </p>
            <Input
              type="number"
              step="0.01"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="h-8 text-sm"
              placeholder="Solde à mettre à jour"
            />
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
        {visibleRows.map((row) => {
          const isSkipped = row.skip || skipped.has(row.id);
          const isDup = row.duplicate && !row.skip;
          return (
            <div
              key={row.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all text-sm ${
                isSkipped || isDup
                  ? "bg-slate-50 border-slate-100 opacity-50"
                  : row.montant >= 0
                  ? "bg-emerald-50/50 border-emerald-100"
                  : "bg-white border-slate-100"
              }`}
            >
              {/* Date */}
              <span className="text-xs text-slate-400 tabular-nums shrink-0 w-20">{row.date}</span>

              {/* Libellé */}
              <span className="flex-1 truncate text-slate-700 min-w-0">
                {row.libelle}
                {isDup && <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">doublon</span>}
                {row.skip && row.skipReason && (
                  <span className="ml-1.5 text-[10px] text-slate-400">({row.skipReason})</span>
                )}
              </span>

              {/* Category selector */}
              {!isSkipped && !isDup && (
                <Select
                  value={categories[row.id] ?? row.categorie}
                  onValueChange={(v) => v && setCategories((c) => ({ ...c, [row.id]: v }))}
                >
                  <SelectTrigger className="h-7 text-xs w-40 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {/* Amount */}
              <span className={`text-xs font-semibold tabular-nums shrink-0 w-20 text-right ${
                row.montant >= 0 ? "text-emerald-600" : "text-slate-700"
              }`}>
                {row.montant >= 0 ? "+" : "-"}{fmtCHF(row.montant)} CHF
              </span>

              {/* Skip/restore button */}
              {!row.skip && !isDup && (
                <button
                  className="text-slate-300 hover:text-slate-500 shrink-0"
                  onClick={() => setSkipped((s) => {
                    const n = new Set(s);
                    n.has(row.id) ? n.delete(row.id) : n.add(row.id);
                    return n;
                  })}
                  title={skipped.has(row.id) ? "Réactiver" : "Ignorer"}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={() => setStep("upload")} disabled={isConfirming}>
          ← Recommencer
        </Button>
        <Button
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          onClick={handleConfirm}
          disabled={isConfirming || activeRows.length === 0}
        >
          {isConfirming ? "Import en cours..." : `Importer ${activeRows.length} transactions`}
        </Button>
      </div>
    </div>
  );
}

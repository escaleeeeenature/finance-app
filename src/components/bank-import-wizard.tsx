"use client";
import { useState, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, X, Eye, EyeOff, ArrowRight } from "lucide-react";
import { parseRevolutFile, parseBCJFile, parseBCJExcelFile, confirmBankImport, type ParsedBankRow, type DetectedTransfer } from "@/lib/actions/bank-import";

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
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Record<string, string>>({});
  // transfer from/to selections keyed by row.id
  const [transferSelections, setTransferSelections] = useState<Record<string, { from: string; to: string }>>({});
  const [soldeCalcule, setSoldeCalcule] = useState<number | undefined>();
  const [newBalance, setNewBalance] = useState<string>("");
  const [account, setAccount] = useState(defaultAccount ?? accounts[0]?.nom ?? (bank === "revolut" ? "Revolut" : "BCJ"));
  const [showSkipped, setShowSkipped] = useState(false);
  const [error, setError] = useState("");
  const [isParsing, startParse] = useTransition();
  const [isConfirming, startConfirm] = useTransition();
  const [importedCount, setImportedCount] = useState(0);
  const [transfersRecorded, setTransfersRecorded] = useState(0);
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
      const fetchedRows = res.rows ?? [];
      setRows(fetchedRows);
      setSoldeCalcule(res.soldeCalcule);
      if (res.soldeCalcule !== undefined) setNewBalance(res.soldeCalcule.toString());
      setCategories(Object.fromEntries(fetchedRows.map((r) => [r.id, r.categorie])));
      // Pre-fill transfer selections: current account is always one side
      const currentAcc = defaultAccount ?? accounts[0]?.nom ?? "";
      setTransferSelections(
        Object.fromEntries(
          fetchedRows
            .filter((r) => r.isTransfer)
            .map((r) => [
              r.id,
              {
                from: r.montant < 0 ? currentAcc : (r.transferTo === currentAcc ? "" : (r.transferTo ?? "")),
                to: r.montant > 0 ? currentAcc : (r.transferTo ?? ""),
              },
            ])
        )
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

    // Build confirmed transfers from rows marked as transfer
    const confirmedTransfers: DetectedTransfer[] = rows
      .filter((r) => r.isTransfer)
      .map((r) => {
        const sel = transferSelections[r.id] ?? { from: "", to: "" };
        return {
          id: r.id,
          date: r.date,
          montant: Math.abs(r.montant),
          libelle: r.libelle,
          from: sel.from,
          to: sel.to,
        };
      })
      .filter((t) => t.from && t.to && t.from !== t.to);

    startConfirm(async () => {
      const res = await confirmBankImport(
        toSend,
        account,
        newBalance ? parseFloat(newBalance) : undefined,
        confirmedTransfers.length > 0 ? confirmedTransfers : undefined
      );
      setImportedCount(res.imported);
      setTransfersRecorded(res.transfersRecorded);
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
        {transfersRecorded > 0 && (
          <p className="text-xs text-amber-600">{transfersRecorded} virement{transfersRecorded > 1 ? "s" : ""} interne{transfersRecorded > 1 ? "s" : ""} enregistré{transfersRecorded > 1 ? "s" : ""}</p>
        )}
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
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">
            Solde final du compte
            {soldeCalcule !== undefined && (
              <span className="text-slate-300 ml-1">(relevé: {fmtCHF(soldeCalcule)} CHF)</span>
            )}
          </p>
          <Input
            type="number"
            step="0.01"
            value={newBalance}
            onChange={(e) => setNewBalance(e.target.value)}
            className="h-8 text-sm"
            placeholder="Ex: 4'250.00"
          />
        </div>
      </div>

      {/* Internal transfers section */}
      {rows.some((r) => r.isTransfer) && (() => {
        const allAccounts = [...accounts.map((a) => a.nom), "Revolut"].filter(
          (v, i, arr) => arr.indexOf(v) === i
        );
        const transferRows = rows.filter((r) => r.isTransfer);
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <ArrowRight size={13} className="text-amber-500" />
              {transferRows.length} virement{transferRows.length > 1 ? "s" : ""} interne{transferRows.length > 1 ? "s" : ""} détecté{transferRows.length > 1 ? "s" : ""}
            </p>
            <p className="text-[11px] text-amber-600">
              Ces transactions seront ignorées de ton relevé. Choisis les comptes pour enregistrer le transfert.
            </p>
            {transferRows.map((r) => {
              const sel = transferSelections[r.id] ?? { from: "", to: "" };
              return (
                <div key={r.id} className="bg-white rounded-lg border border-amber-100 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 tabular-nums">{r.date}</span>
                    <span className="font-medium text-slate-700 flex-1 mx-3 truncate">{r.libelle}</span>
                    <span className="font-semibold text-slate-700 tabular-nums shrink-0">
                      {fmtCHF(r.montant)} CHF
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-0.5">
                      <p className="text-[10px] text-slate-400 font-medium">De</p>
                      <Select
                        value={sel.from}
                        onValueChange={(v) => v && setTransferSelections((s) => ({
                          ...s, [r.id]: { ...s[r.id], from: v }
                        }))}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Compte..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allAccounts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 mt-4 shrink-0" />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-[10px] text-slate-400 font-medium">Vers</p>
                      <Select
                        value={sel.to}
                        onValueChange={(v) => v && setTransferSelections((s) => ({
                          ...s, [r.id]: { ...s[r.id], to: v }
                        }))}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Compte..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allAccounts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

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
              <span className="flex-1 min-w-0 text-slate-700" title={row.libelle}>
                <span className="block truncate text-sm">{row.libelle}</span>
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

"use client";
import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, X } from "lucide-react";
import { parseSwissquoteFile, confirmImport, type ParsedInvestRow } from "@/lib/actions/import";

const CLASSES = ["ETF", "Action", "Obligation", "Crypto", "Matière première", "Autre"];

export function ImportWizard() {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<ParsedInvestRow[]>([]);
  const [isParsing, startParsing] = useTransition();
  const [isImporting, startImporting] = useTransition();
  const [error, setError] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    startParsing(async () => {
      const res = await parseSwissquoteFile(fd);
      if (res.error) { setError(res.error); return; }
      if (res.rows) { setRows(res.rows); setStep("preview"); }
    });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function setClasse(idx: number, classe: string) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, classe } : r));
  }

  function toggleDuplicate(idx: number) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, duplicate: !r.duplicate } : r));
  }

  function handleConfirm() {
    startImporting(async () => {
      const res = await confirmImport(rows);
      if (res.error) { setError(res.error); return; }
      setImportedCount(res.imported ?? 0);
      setStep("done");
    });
  }

  const toImport = rows.filter((r) => !r.duplicate);
  const duplicates = rows.filter((r) => r.duplicate);

  // ── Upload step ───────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-4 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all
            ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"}
          `}
        >
          <div className={`p-4 rounded-2xl transition-all ${dragOver ? "bg-indigo-100" : "bg-white shadow-sm"}`}>
            {isParsing
              ? <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              : <FileSpreadsheet size={40} className="text-indigo-400" />
            }
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-700">
              {isParsing ? "Analyse en cours…" : "Glisse ton fichier Swissquote ici"}
            </p>
            <p className="text-sm text-slate-400 mt-1">ou clique pour sélectionner</p>
            <p className="text-xs text-slate-300 mt-2">.xlsx ou .csv</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={onInputChange}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-700 space-y-1">
          <p className="font-semibold">Comment exporter depuis Swissquote ?</p>
          <p>Compte → Relevé de transactions → sélectionne la période → Obtenir un relevé (.xlsx)</p>
          <p className="text-amber-500">Seules les lignes <strong>Achat</strong> et <strong>Vente</strong> seront importées.</p>
        </div>
      </div>
    );
  }

  // ── Done step ─────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-12">
        <div className="flex justify-center">
          <div className="p-5 rounded-full bg-emerald-50">
            <CheckCircle size={48} className="text-emerald-500" />
          </div>
        </div>
        <div>
          <p className="text-xl font-bold text-slate-900">{importedCount} transaction{importedCount > 1 ? "s" : ""} importée{importedCount > 1 ? "s" : ""} !</p>
          <p className="text-sm text-slate-500 mt-1">Tes investissements ont été mis à jour.</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => { setStep("upload"); setRows([]); setError(""); }}>
            Importer un autre fichier
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => window.location.href = "/investments"}
          >
            Voir mes investissements
          </Button>
        </div>
      </div>
    );
  }

  // ── Preview step ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-sm px-3 py-1">
          {toImport.length} à importer
        </Badge>
        {duplicates.length > 0 && (
          <Badge className="bg-slate-100 text-slate-500 border-0 text-sm px-3 py-1">
            {duplicates.length} déjà présente{duplicates.length > 1 ? "s" : ""} (ignorée{duplicates.length > 1 ? "s" : ""})
          </Badge>
        )}
        <span className="text-xs text-slate-400 ml-auto">
          Clique sur ✕ pour ignorer une ligne
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Symbole</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qté</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prix</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Frais</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Classe</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-slate-50 transition-all ${r.duplicate ? "opacity-40 bg-slate-50" : "hover:bg-slate-50/50"}`}
                >
                  <td className="px-4 py-2.5 tabular-nums text-slate-600 text-xs">{r.date}</td>
                  <td className="px-4 py-2.5">
                    <Badge className={`text-xs border-0 ${r.type === "Achat" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {r.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div>
                      <span className="font-medium text-slate-800">{r.symbole}</span>
                      {r.devise && r.devise !== "CHF" && (
                        <span className="ml-1 text-xs text-slate-400">{r.devise}</span>
                      )}
                    </div>
                    {r.nom && <div className="text-xs text-slate-400 truncate max-w-[120px]">{r.nom}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{r.quantite}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{r.prixUnitaire.toFixed(3)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{r.frais.toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    {!r.duplicate ? (
                      <select
                        value={r.classe}
                        onChange={(e) => setClasse(idx, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      >
                        {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400">déjà importée</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleDuplicate(idx)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-all"
                      title={r.duplicate ? "Réactiver" : "Ignorer"}
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => { setStep("upload"); setRows([]); }}>
          ← Changer de fichier
        </Button>
        <Button
          disabled={isImporting || toImport.length === 0}
          onClick={handleConfirm}
          className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[180px]"
        >
          {isImporting ? "Import en cours…" : `Importer ${toImport.length} transaction${toImport.length > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}

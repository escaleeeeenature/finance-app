"use client";
import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, FileSpreadsheet, X } from "lucide-react";
import {
  parseSwissquoteFile, confirmImport,
  type ParsedInvestRow, type ParsedFraisRow, type ParsedDividendeRow,
} from "@/lib/actions/import";

const CLASSES = ["ETF", "Action", "Obligation", "Crypto", "Matière première", "Autre"];

export function ImportWizard() {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [invest, setInvest] = useState<ParsedInvestRow[]>([]);
  const [frais, setFrais] = useState<ParsedFraisRow[]>([]);
  const [dividendes, setDividendes] = useState<ParsedDividendeRow[]>([]);
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
      setInvest(res.invest ?? []);
      setFrais(res.frais ?? []);
      setDividendes(res.dividendes ?? []);
      setStep("preview");
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function setClasse(idx: number, classe: string) {
    setInvest((prev) => prev.map((r, i) => i === idx ? { ...r, classe } : r));
  }

  function toggleInvest(idx: number) {
    setInvest((prev) => prev.map((r, i) => i === idx ? { ...r, duplicate: !r.duplicate } : r));
  }
  function toggleFrais(idx: number) {
    setFrais((prev) => prev.map((r, i) => i === idx ? { ...r, duplicate: !r.duplicate } : r));
  }
  function toggleDiv(idx: number) {
    setDividendes((prev) => prev.map((r, i) => i === idx ? { ...r, duplicate: !r.duplicate } : r));
  }

  function handleConfirm() {
    startImporting(async () => {
      const res = await confirmImport(invest, frais, dividendes);
      if (res.error) { setError(res.error); return; }
      setImportedCount(res.imported ?? 0);
      setStep("done");
    });
  }

  const toImportInvest = invest.filter((r) => !r.duplicate);
  const toImportFrais = frais.filter((r) => !r.duplicate);
  const toImportDivs = dividendes.filter((r) => !r.duplicate);
  const totalNew = toImportInvest.length + toImportFrais.length + toImportDivs.length;

  // ── Upload ────────────────────────────────────────────────────────
  if (step === "upload") return (
    <div className="max-w-lg mx-auto space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all
          ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"}`}
      >
        <div className={`p-4 rounded-2xl transition-all ${dragOver ? "bg-indigo-100" : "bg-white shadow-sm"}`}>
          {isParsing
            ? <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            : <FileSpreadsheet size={40} className="text-indigo-400" />}
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-700">{isParsing ? "Analyse en cours…" : "Glisse ton fichier Swissquote ici"}</p>
          <p className="text-sm text-slate-400 mt-1">ou clique pour sélectionner</p>
          <p className="text-xs text-slate-300 mt-2">.xlsx ou .csv</p>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-700 space-y-1">
        <p className="font-semibold">Ce qui sera importé automatiquement :</p>
        <p>✅ <strong>Achat / Vente</strong> → Invest_Transactions</p>
        <p>✅ <strong>Droits de Garde</strong> → Frais_Courtier</p>
        <p>✅ <strong>Dividendes</strong> → Dividendes</p>
        <p className="text-amber-500 mt-1">Les doublons sont détectés et ignorés automatiquement.</p>
      </div>
    </div>
  );

  // ── Done ──────────────────────────────────────────────────────────
  if (step === "done") return (
    <div className="max-w-lg mx-auto text-center space-y-6 py-12">
      <div className="flex justify-center">
        <div className="p-5 rounded-full bg-emerald-50"><CheckCircle size={48} className="text-emerald-500" /></div>
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">{importedCount} ligne{importedCount > 1 ? "s" : ""} importée{importedCount > 1 ? "s" : ""} !</p>
        <p className="text-sm text-slate-500 mt-1">Transactions, frais et dividendes mis à jour.</p>
      </div>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={() => { setStep("upload"); setInvest([]); setFrais([]); setDividendes([]); setError(""); }}>
          Importer un autre fichier
        </Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => window.location.href = "/investments"}>
          Voir mes investissements
        </Button>
      </div>
    </div>
  );

  // ── Preview ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        {toImportInvest.length > 0 && <Badge className="bg-indigo-100 text-indigo-700 border-0">{toImportInvest.length} transaction{toImportInvest.length > 1 ? "s" : ""}</Badge>}
        {toImportFrais.length > 0 && <Badge className="bg-orange-100 text-orange-700 border-0">{toImportFrais.length} frais</Badge>}
        {toImportDivs.length > 0 && <Badge className="bg-emerald-100 text-emerald-700 border-0">{toImportDivs.length} dividende{toImportDivs.length > 1 ? "s" : ""}</Badge>}
        {totalNew === 0 && <Badge className="bg-slate-100 text-slate-500 border-0">Tout déjà importé</Badge>}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      {/* Invest rows */}
      {invest.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">📈 Transactions d&apos;investissement</p>
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="text-left px-4 py-2">Date</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Symbole</th>
                    <th className="text-right px-4 py-2">Qté</th>
                    <th className="text-right px-4 py-2">Prix</th>
                    <th className="text-right px-4 py-2">Frais</th>
                    <th className="text-left px-4 py-2">Classe</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {invest.map((r, idx) => (
                    <tr key={idx} className={`border-b border-slate-50 ${r.duplicate ? "opacity-40 bg-slate-50" : "hover:bg-slate-50/50"}`}>
                      <td className="px-4 py-2 text-xs tabular-nums text-slate-500">{r.date}</td>
                      <td className="px-4 py-2">
                        <Badge className={`text-xs border-0 ${r.type === "Achat" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{r.type}</Badge>
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-800">{r.symbole}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-600">{r.quantite}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-600">{r.prixUnitaire.toFixed(3)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-400">{r.frais.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        {!r.duplicate ? (
                          <select value={r.classe} onChange={(e) => setClasse(idx, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                            {CLASSES.map((c) => <option key={c}>{c}</option>)}
                          </select>
                        ) : <span className="text-xs text-slate-400">déjà importée</span>}
                      </td>
                      <td className="px-4 py-2">
                        <button onClick={() => toggleInvest(idx)} className="p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500">
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Frais rows */}
      {frais.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">💰 Frais de courtier</p>
          <Card className="border-0 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-right px-4 py-2">Montant</th>
                  <th className="text-left px-4 py-2">Devise</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {frais.map((r, idx) => (
                  <tr key={idx} className={`border-b border-slate-50 ${r.duplicate ? "opacity-40 bg-slate-50" : "hover:bg-slate-50/50"}`}>
                    <td className="px-4 py-2 text-xs tabular-nums text-slate-500">{r.date}</td>
                    <td className="px-4 py-2 text-slate-700">{r.type}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-orange-600 font-medium">-{r.montant.toFixed(2)}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{r.devise}</td>
                    <td className="px-4 py-2">
                      {r.duplicate
                        ? <span className="text-xs text-slate-400">déjà importé</span>
                        : <button onClick={() => toggleFrais(idx)} className="p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500"><X size={13} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Dividendes rows */}
      {dividendes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">🎯 Dividendes reçus</p>
          <Card className="border-0 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Symbole</th>
                  <th className="text-right px-4 py-2">Montant</th>
                  <th className="text-left px-4 py-2">Devise</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {dividendes.map((r, idx) => (
                  <tr key={idx} className={`border-b border-slate-50 ${r.duplicate ? "opacity-40 bg-slate-50" : "hover:bg-slate-50/50"}`}>
                    <td className="px-4 py-2 text-xs tabular-nums text-slate-500">{r.date}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{r.symbole}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-600 font-medium">+{r.montant.toFixed(2)}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{r.devise}</td>
                    <td className="px-4 py-2">
                      {r.duplicate
                        ? <span className="text-xs text-slate-400">déjà importé</span>
                        : <button onClick={() => toggleDiv(idx)} className="p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500"><X size={13} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={() => { setStep("upload"); setInvest([]); setFrais([]); setDividendes([]); }}>
          ← Changer de fichier
        </Button>
        <Button disabled={isImporting || totalNew === 0} onClick={handleConfirm}
          className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px]">
          {isImporting ? "Import en cours…" : `Importer ${totalNew} ligne${totalNew > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}

"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { createBudgetFromSuggestions } from "@/lib/actions/budget";

type Suggestion = {
  categorie: string;
  type: "Dépense" | "Revenu";
  montant: number;
  nbMois: number; // number of months this category appeared in
};

function fmtCHF(n: number) {
  return n.toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function SmartBudgetPrompt({
  mois,
  suggestions,
}: {
  mois: string;
  suggestions: Suggestion[];
}) {
  const [open, setOpen] = useState(true);
  const [amounts, setAmounts] = useState<Record<string, number>>(
    Object.fromEntries(suggestions.map((s) => [s.categorie, s.montant]))
  );
  const [isPending, startTransition] = useTransition();

  if (suggestions.length === 0) return null;

  const revenus = suggestions.filter((s) => s.type === "Revenu");
  const depenses = suggestions.filter((s) => s.type === "Dépense");

  function handleConfirm() {
    startTransition(async () => {
      const lines = suggestions.map((s) => ({
        categorie: s.categorie,
        type: s.type,
        montant: amounts[s.categorie] ?? s.montant,
      }));
      await createBudgetFromSuggestions(mois, lines);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-500" />
            Budget suggéré — {mois}
          </DialogTitle>
          <p className="text-xs text-slate-400 mt-1">
            Basé sur la moyenne de tes 3 derniers mois. Ajuste les montants si besoin.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Revenus */}
          {revenus.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={13} className="text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Revenus</span>
              </div>
              <div className="space-y-2">
                {revenus.map((s) => (
                  <div key={s.categorie} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{s.categorie}</p>
                      <p className="text-[10px] text-slate-400">
                        Présent {s.nbMois} mois sur 3 · moy. {fmtCHF(s.montant)} CHF
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        step="10"
                        value={amounts[s.categorie] ?? s.montant}
                        onChange={(e) => setAmounts((a) => ({ ...a, [s.categorie]: +e.target.value }))}
                        className="w-28 text-right text-sm h-8"
                      />
                      <span className="text-xs text-slate-400">CHF</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dépenses */}
          {depenses.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown size={13} className="text-red-500" />
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Dépenses</span>
              </div>
              <div className="space-y-2">
                {depenses.map((s) => (
                  <div key={s.categorie} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{s.categorie}</p>
                      <p className="text-[10px] text-slate-400">
                        Présent {s.nbMois} mois sur 3 · moy. {fmtCHF(s.montant)} CHF
                        {s.nbMois < 3 && " ⚠ pas chaque mois"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        step="10"
                        value={amounts[s.categorie] ?? s.montant}
                        onChange={(e) => setAmounts((a) => ({ ...a, [s.categorie]: +e.target.value }))}
                        className="w-28 text-right text-sm h-8"
                      />
                      <span className="text-xs text-slate-400">CHF</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totaux */}
          <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Revenus totaux</span>
            <span className="font-semibold text-emerald-600 tabular-nums">
              {fmtCHF(revenus.reduce((s, r) => s + (amounts[r.categorie] ?? r.montant), 0))} CHF
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Dépenses totales</span>
            <span className="font-semibold text-red-500 tabular-nums">
              {fmtCHF(depenses.reduce((s, d) => s + (amounts[d.categorie] ?? d.montant), 0))} CHF
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 text-slate-500"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Ignorer
            </Button>
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Création..." : "Créer ce budget"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

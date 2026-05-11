"use client";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { fmtCHF } from "@/lib/utils";
import { EditBudgetLine } from "@/components/budget-forms";
import { ChevronDown, ChevronRight } from "lucide-react";

type Tx = { date: string; libelle: string; montant: number; compte: string };

export function BudgetCategoryLine({
  mois,
  categorie,
  prevu,
  reel,
  transactions,
}: {
  mois: string;
  categorie: string;
  prevu: number;
  reel: number;
  transactions: Tx[];
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = prevu > 0 ? Math.min(Math.round((reel / prevu) * 100), 100) : 0;
  const color = pct > 100 ? "text-red-600" : pct > 80 ? "text-amber-600" : "text-emerald-600";
  const barColor = pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-indigo-500";

  return (
    <div className="group border-b border-slate-100 last:border-0">
      <div className="py-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
            >
              {expanded
                ? <ChevronDown size={13} className="text-slate-400" />
                : <ChevronRight size={13} className="text-slate-400" />}
              {categorie}
              {transactions.length > 0 && (
                <span className="text-xs text-slate-400 font-normal ml-0.5">({transactions.length})</span>
              )}
            </button>
            <EditBudgetLine mois={mois} categorie={categorie} montantActuel={prevu} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 tabular-nums">{fmtCHF(reel)} / {fmtCHF(prevu)}</span>
            <span className={`text-xs font-semibold tabular-nums w-9 text-right ${color}`}>{pct}%</span>
          </div>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-4">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {expanded && (
        <div className="ml-4 mb-3 rounded-lg border border-slate-100 overflow-hidden">
          {transactions.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-medium">
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Libellé</th>
                  <th className="text-left px-3 py-2">Compte</th>
                  <th className="text-right px-3 py-2">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500">{t.date}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{t.libelle}</td>
                    <td className="px-3 py-2 text-slate-400">{t.compte}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-800">{fmtCHF(t.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-400 px-3 py-3">Aucune transaction ce mois-ci</p>
          )}
        </div>
      )}
    </div>
  );
}

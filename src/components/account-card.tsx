"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fmtCHF } from "@/lib/utils";
import { TransactionList } from "@/components/transaction-list";

type TxRow = Record<string, string>;

export function AccountCard({
  nom, type, solde, pct, couleur, transactions, accounts, budgets,
}: {
  nom: string; type: string; solde: number; pct: number; couleur: string;
  transactions: TxRow[];
  accounts: Record<string, string>[];
  budgets: Record<string, string>[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="h-3 w-3 rounded-full shrink-0 mt-0.5" style={{ background: couleur }} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800">{nom}</p>
            <p className="text-xs text-slate-400">{type}</p>
          </div>

          {/* Progress bar inline */}
          <div className="hidden sm:flex flex-col items-end gap-1 w-32">
            <span className="text-xs text-slate-400">{Math.round(pct)}% du total</span>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: couleur }} />
            </div>
          </div>

          <p className="text-xl font-bold tabular-nums text-slate-900 ml-4 shrink-0">{fmtCHF(solde)}</p>

          <div className="ml-3 text-slate-400 shrink-0">
            {expanded
              ? <ChevronUp size={16} />
              : <ChevronDown size={16} />
            }
          </div>
        </button>

        {/* Transactions */}
        {expanded && (
          <div className="border-t border-slate-100">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Aucune transaction pour ce compte</p>
            ) : (
              <>
                <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs text-slate-400">{transactions.length} transaction{transactions.length > 1 ? "s" : ""}</p>
                </div>
                <TransactionList
                  transactions={transactions}
                  accounts={accounts}
                  budgets={budgets}
                  limit={50}
                />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

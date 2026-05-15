"use client";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
import { parseNum, fmtCHF } from "@/lib/utils";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";

type TxType = "Dépense" | "Revenu" | "Transfert";

const TYPE_CONFIG: Record<TxType, { bg: string; color: string; sign: string; Icon: React.ElementType }> = {
  Dépense:   { bg: "bg-red-50",     color: "text-red-500",     sign: "−", Icon: ArrowDownCircle },
  Revenu:    { bg: "bg-emerald-50", color: "text-emerald-600", sign: "+", Icon: ArrowUpCircle },
  Transfert: { bg: "bg-slate-100",  color: "text-slate-400",   sign: "",  Icon: ArrowLeftRight },
};

type TxRow = Record<string, string>; // _idx stored as string under "_idx" key

export function TransactionList({
  transactions,
  accounts,
  budgets,
  limit = 100,
}: {
  transactions: TxRow[];
  accounts: Record<string, string>[];
  budgets: Record<string, string>[];
  limit?: number;
}) {
  const [selected, setSelected] = useState<{
    rowIdx: number; date: string; libelle: string;
    montant: string; categorie: string; compte: string; type: string;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function openEdit(t: TxRow) {
    setSelected({
      rowIdx: Number(t["_idx"]),
      date: t["Date"] || "",
      libelle: t["Libellé"] || "",
      montant: t["Montant"] || "0",
      categorie: t["Catégorie"] || "",
      compte: t["Compte_Source"] || "",
      type: t["Type"] || "Dépense",
    });
    setDialogOpen(true);
  }

  const visible = transactions.slice(0, limit);

  return (
    <>
      <div className="divide-y divide-slate-100">
        {visible.map((t) => {
          const txType = (t["Type"] as TxType) ?? "Transfert";
          const { bg, color, sign, Icon } = TYPE_CONFIG[txType] ?? TYPE_CONFIG.Transfert;
          return (
            <button
              key={t["_idx"]}
              onClick={() => openEdit(t)}
              className="w-full flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors text-left"
            >
              <div className={`p-2 rounded-full ${bg} shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{t["Libellé"] || "—"}</p>
                <p className="text-xs text-slate-400">
                  {t["Date"]} · {t["Catégorie"]} · {t["Compte_Source"]}
                </p>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${color} shrink-0`}>
                {sign}{fmtCHF(parseNum(t["Montant"]))}
              </span>
            </button>
          );
        })}
        {transactions.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">Aucune transaction enregistrée</p>
        )}
      </div>

      <EditTransactionDialog
        tx={selected}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelected(null); }}
        accounts={accounts}
        budgets={budgets}
      />
    </>
  );
}

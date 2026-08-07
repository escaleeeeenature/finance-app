"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { updateTransaction, deleteTransaction } from "@/lib/actions/transactions";
import { toMoisStr } from "@/lib/utils";

type AccountRow = Record<string, string>;
type BudgetRow = Record<string, string>;

type Tx = {
  rowIdx: number;
  date: string;     // "dd/mm/yyyy"
  libelle: string;
  montant: string;
  categorie: string;
  compte: string;
  type: string;
};

// Convert "dd/mm/yyyy" → "yyyy-mm-dd" for <input type="date">
function appToIso(d: string) {
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

// Convert "yyyy-mm-dd" → "dd/mm/yyyy"
function isoToApp(d: string) {
  const [yyyy, mm, dd] = d.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

export function EditTransactionDialog({
  tx,
  open,
  onClose,
  accounts,
  budgets,
}: {
  tx: Tx | null;
  open: boolean;
  onClose: () => void;
  accounts: AccountRow[];
  budgets: BudgetRow[];
}) {
  const [type, setType] = useState(tx?.type ?? "Dépense");
  const [date, setDate] = useState(tx?.date ? appToIso(tx.date) : "");
  const [compte, setCompte] = useState(tx?.compte ?? "");
  const [categorie, setCategorie] = useState(tx?.categorie ?? "");
  const [libelle, setLibelle] = useState(tx?.libelle ?? "");
  const [montant, setMontant] = useState(tx?.montant ?? "");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpen(val: boolean) {
    if (!val) { onClose(); setConfirmDelete(false); setError(""); }
  }

  const moisStr = toMoisStr(new Date(date + "T12:00:00"));
  const cats = [...new Set(budgets
    .filter((b) => b["Mois"] === moisStr && b["Type"] === type)
    .map((b) => b["Catégorie"]))];
  // Always include current category even if not in this month's budget
  if (categorie && !cats.includes(categorie)) cats.unshift(categorie);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tx) return;
    setError("");
    startTransition(async () => {
      const res = await updateTransaction(tx.rowIdx, {
        date: isoToApp(date),
        libelle,
        montant,
        categorie: categorie || cats[0] || "",
        compte,
        type,
      });
      if (res?.error) { setError(res.error); return; }
      onClose();
    });
  }

  function handleDelete() {
    if (!tx) return;
    startTransition(async () => {
      await deleteTransaction(tx.rowIdx);
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;opération</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => { if (v) { setType(v); setCategorie(""); } }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dépense">Dépense</SelectItem>
                  <SelectItem value="Revenu">Revenu</SelectItem>
                  <SelectItem value="Transfert">Transfert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Compte</Label>
              <Select value={compte} onValueChange={(v) => { if (v) setCompte(v); }}>
                <SelectTrigger><SelectValue placeholder="Compte..." /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a["Banque"]} value={a["Banque"]}>{a["Banque"]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={categorie} onValueChange={(v) => { if (v) setCategorie(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder={cats.length ? "Choisir..." : "Aucune"} />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Libellé</Label>
            <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>Montant (CHF)</Label>
            <Input
              type="number" min="0.01" step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            {/* Delete */}
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
              >
                <Trash2 size={13} /> Supprimer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {isPending ? "Suppression..." : "Confirmer la suppression"}
              </button>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

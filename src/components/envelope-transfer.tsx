"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownToLine } from "lucide-react";
import { recordMonthlyTransfer } from "@/lib/actions/envelopes";

type Envelope = Record<string, string>;

interface TransferRow {
  id: string;
  nom: string;
  couleur: string;
  contribution: number;
  montant: number; // editable amount
  note: string;
}

export function EnvelopeTransferDialog({
  envelopes,
  mois,
}: {
  envelopes: Envelope[];
  mois: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const initial = (): TransferRow[] =>
    envelopes
      .filter((e) => e["actif"] !== "false")
      .map((e) => ({
        id: e["id"],
        nom: e["nom"],
        couleur: e["couleur"] || "#6366f1",
        contribution: parseFloat(e["contribution_mensuelle"] || "0") || 0,
        montant: parseFloat(e["contribution_mensuelle"] || "0") || 0,
        note: "",
      }));

  const [rows, setRows] = useState<TransferRow[]>(initial);

  function openDialog() {
    setRows(initial());
    setError("");
    setOpen(true);
  }

  function setMontant(id: string, val: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, montant: parseFloat(val) || 0 } : r))
    );
  }

  function setNote(id: string, val: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, note: val } : r))
    );
  }

  const total = rows.reduce((s, r) => s + r.montant, 0);

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      try {
        await recordMonthlyTransfer(
          rows.map((r) => ({ id: r.id, montant: r.montant, note: r.note })),
          mois
        );
        setOpen(false);
      } catch {
        setError("Une erreur est survenue. Réessaie.");
      }
    });
  }

  return (
    <>
      <Button
        size="sm"
        onClick={openDialog}
        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
      >
        <ArrowDownToLine size={15} /> Virement mensuel
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Virement mensuel — {mois}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                {/* color dot */}
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ background: r.couleur }}
                />
                {/* name */}
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                  {r.nom}
                </span>
                {/* suggested */}
                {r.contribution > 0 && (
                  <span className="text-xs text-slate-400 shrink-0">
                    ({r.contribution.toFixed(2)})
                  </span>
                )}
                {/* amount */}
                <Input
                  type="number"
                  step="0.01"
                  value={r.montant}
                  onChange={(e) => setMontant(r.id, e.target.value)}
                  className="w-24 text-right text-sm h-8"
                />
                {/* note */}
                <Input
                  type="text"
                  placeholder="Note"
                  value={r.note}
                  onChange={(e) => setNote(r.id, e.target.value)}
                  className="w-28 text-sm h-8"
                />
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-sm font-semibold text-slate-600">Total viré</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {total.toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF
            </span>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={isPending || total === 0}
              onClick={handleConfirm}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? "En cours…" : `Confirmer — ${total.toFixed(2)} CHF`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

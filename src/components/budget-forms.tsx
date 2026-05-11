"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { addBudgetLine, updateBudgetLine, deleteBudgetLine } from "@/lib/actions/budget";

export function AddBudgetDialog({ mois }: { mois: string }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [type, setType] = useState("Dépense");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function openDialog() {
    setType("Dépense");
    setError("");
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("mois", mois);
    fd.set("type", type);
    startTransition(async () => {
      const res = await addBudgetLine(fd);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={openDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
        <Plus size={15} /> Ajouter une ligne
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle ligne budgétaire — {mois}</DialogTitle>
          </DialogHeader>
          <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Input name="categorie" placeholder="ex: Loyer, Salaire, Courses..." required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => { if (v) setType(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dépense">Dépense</SelectItem>
                    <SelectItem value="Revenu">Revenu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Montant prévu (CHF)</Label>
                <Input name="montant" type="number" min="0" step="0.01" defaultValue="0" />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EditBudgetLine({
  mois,
  categorie,
  montantActuel,
}: {
  mois: string;
  categorie: string;
  montantActuel: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("mois", mois);
    fd.set("categorie", categorie);
    startTransition(async () => {
      await updateBudgetLine(fd);
      setOpen(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteBudgetLine(mois, categorie);
      setOpen(false);
    });
  }

  return (
    <>
      {/* Always visible at low opacity — works on mobile too */}
      <button
        onClick={() => setOpen(true)}
        className="opacity-40 hover:opacity-100 p-1 rounded hover:bg-slate-200 transition-all"
        title={`Modifier ${categorie}`}
      >
        <Pencil size={12} className="text-slate-500" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Modifier — {categorie}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Montant prévu (CHF)</Label>
              <Input name="montant" type="number" min="0" step="0.01" defaultValue={montantActuel} required />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                {isPending ? "..." : "Mettre à jour"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={handleDelete}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { addTransaction } from "@/lib/actions/transactions";
import { toMoisStr, isoToAppDate } from "@/lib/utils";

const today = () => new Date().toISOString().split("T")[0];

type AccountRow = Record<string, string>;
type BudgetRow = Record<string, string>;

export function AddTransactionDialog({
  accounts,
  budgets,
}: {
  accounts: AccountRow[];
  budgets: BudgetRow[];
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [type, setType] = useState("Dépense");
  const [date, setDate] = useState(today());
  const [compte, setCompte] = useState(accounts[0]?.["Banque"] ?? "");
  const [categorie, setCategorie] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const moisStr = toMoisStr(new Date(date + "T12:00:00"));
  const cats = budgets
    .filter((b) => b["Mois"] === moisStr && b["Type"] === type)
    .map((b) => b["Catégorie"]);

  function openDialog() {
    setType("Dépense");
    setDate(today());
    setCompte(accounts[0]?.["Banque"] ?? "");
    setCategorie("");
    setError("");
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("type", type);
    fd.set("date", isoToAppDate(date));
    fd.set("compte", compte);
    fd.set("categorie", categorie || cats[0] || "");
    startTransition(async () => {
      const res = await addTransaction(fd);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={openDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
        <Plus size={15} /> Saisie manuelle
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle opération</DialogTitle>
          </DialogHeader>
          <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => { if (v) { setType(v); setCategorie(""); } }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dépense">Dépense</SelectItem>
                    <SelectItem value="Revenu">Revenu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Compte</Label>
                <Select value={compte} onValueChange={(v) => { if (v) setCompte(v); }}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
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
                    <SelectValue placeholder={cats.length ? "Choisir..." : "Aucune ce mois"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Libellé</Label>
              <Input name="libelle" placeholder="ex: Migros, Netflix..." required />
            </div>

            <div className="space-y-1.5">
              <Label>Montant (CHF)</Label>
              <Input name="montant" type="number" min="0.01" step="0.01" placeholder="0.00" required />
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

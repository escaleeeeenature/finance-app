"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowLeftRight } from "lucide-react";
import { addAccount } from "@/lib/actions/accounts";
import { addTransfer } from "@/lib/actions/transactions";

export function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addAccount(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
        <Plus size={15} /> Ajouter un compte
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau compte bancaire</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom de la banque</Label>
                <Input name="banque" placeholder="ex: UBS, Revolut..." required />
              </div>
              <div className="space-y-1.5">
                <Label>IBAN (optionnel)</Label>
                <Input name="iban" placeholder="CH..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select name="type" defaultValue="Courant">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Courant", "Épargne", "Investissement", "Cash"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Solde initial (CHF)</Label>
                <Input name="solde" type="number" min="0" step="0.01" defaultValue="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <Input name="couleur" type="color" defaultValue="#6366f1" className="h-10 cursor-pointer" />
            </div>
            <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TransferDialog({ accounts }: { accounts: Record<string, string>[] }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(accounts[0]?.["Banque"] ?? "");
  const [dest, setDest] = useState(accounts[1]?.["Banque"] ?? accounts[0]?.["Banque"] ?? "");
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("source", source);
    fd.set("dest", dest);
    fd.set("date", (fd.get("date") as string).split("-").reverse().join("/"));
    startTransition(async () => {
      await addTransfer(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <ArrowLeftRight size={15} /> Virement
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Virement interne</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source (débité)</Label>
                <Select value={source} onValueChange={(v) => { if (v) setSource(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a["Banque"]} value={a["Banque"]}>{a["Banque"]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Destination (crédité)</Label>
                <Select value={dest} onValueChange={(v) => { if (v) setDest(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a["Banque"]} value={a["Banque"]}>{a["Banque"]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Montant (CHF)</Label>
                <Input name="montant" type="number" min="0.01" step="0.01" placeholder="0.00" required />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input name="date" type="date" defaultValue={today} />
              </div>
            </div>
            <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {isPending ? "Transfert en cours..." : "Valider le virement"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

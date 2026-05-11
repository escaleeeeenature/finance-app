"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings } from "lucide-react";
import { addInvestTransaction, updateManualPrice } from "@/lib/actions/investments";

const CLASSES = ["ETF", "Crypto", "Fonds", "Actions", "Autre"];

export function AddInvestDialog({
  accounts,
  budgetCats,
}: {
  accounts: Record<string, string>[];
  budgetCats: string[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Achat");
  const [classe, setClasse] = useState("ETF");
  const [compte, setCompte] = useState(accounts[0]?.["Banque"] ?? "");
  const [categorie, setCategorie] = useState(budgetCats[0] ?? "Investissement");
  const [isStockInitial, setIsStockInitial] = useState(false);
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("type", type);
    fd.set("classe", classe);
    fd.set("compte", compte);
    fd.set("categorie", categorie);
    fd.set("isStockInitial", String(isStockInitial));
    fd.set("date", (fd.get("date") as string).split("-").reverse().join("/"));
    startTransition(async () => {
      await addInvestTransaction(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
        <Plus size={15} /> Nouvelle opération
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle transaction d&apos;investissement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input name="date" type="date" defaultValue={today} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => { if (v) setType(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Achat">Achat</SelectItem>
                    <SelectItem value="Vente">Vente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Classe</Label>
                <Select value={classe} onValueChange={(v) => { if (v) setClasse(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Symbole / Nom</Label>
              <Input name="symbole" placeholder="ex: VWRL, Bitcoin, Raiffeisen Futura..." required />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Quantité</Label>
                <Input name="qte" type="number" min="0" step="0.00000001" placeholder="0" required />
              </div>
              <div className="space-y-1.5">
                <Label>Prix unitaire</Label>
                <Input name="prix" type="number" min="0" step="0.01" placeholder="0.00" required />
              </div>
              <div className="space-y-1.5">
                <Label>Frais</Label>
                <Input name="frais" type="number" min="0" step="0.01" defaultValue="0" />
              </div>
            </div>

            {!isStockInitial && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Compte bancaire</Label>
                  <Select value={compte} onValueChange={(v) => { if (v) setCompte(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a["Banque"]} value={a["Banque"]}>{a["Banque"]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Poste budget</Label>
                  <Select value={categorie} onValueChange={(v) => { if (v) setCategorie(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(budgetCats.length ? budgetCats : ["Investissement"]).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isStockInitial}
                onChange={(e) => setIsStockInitial(e.target.checked)}
                className="rounded"
              />
              Stock initial (achat passé, ne pas impacter le solde bancaire)
            </label>

            <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ManualPriceDialog({
  manualAssets,
}: {
  manualAssets: Record<string, string>[];
}) {
  const [open, setOpen] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(manualAssets.map((a) => [a["Symbole"], a["Prix_Manuel"]]))
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      for (const [sym, prix] of Object.entries(prices)) {
        await updateManualPrice(sym, prix);
      }
      setOpen(false);
    });
  }

  if (manualAssets.length === 0) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Settings size={15} /> Prix manuels
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mettre à jour les prix manuels</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {manualAssets.map((a) => (
              <div key={a["Symbole"]} className="space-y-1.5">
                <Label>{a["Symbole"]}</Label>
                <Input
                  type="number" step="0.01" value={prices[a["Symbole"]] ?? ""}
                  onChange={(e) => setPrices((p) => ({ ...p, [a["Symbole"]]: e.target.value }))}
                />
              </div>
            ))}
            <Button onClick={save} disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {isPending ? "Mise à jour..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

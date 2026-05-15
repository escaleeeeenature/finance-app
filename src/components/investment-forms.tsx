"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings } from "lucide-react";
import { addInvestTransaction, updateManualPrice } from "@/lib/actions/investments";
import { isoToAppDate } from "@/lib/utils";

const CLASSES = ["ETF", "Crypto", "Fonds", "Actions", "Autre"];
const today = () => new Date().toISOString().split("T")[0];

export function AddInvestDialog({
  accounts,
  budgetCats,
}: {
  accounts: Record<string, string>[];
  budgetCats: string[];
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [type, setType] = useState("Achat");
  const [classe, setClasse] = useState("ETF");
  const [compte, setCompte] = useState(accounts[0]?.["Banque"] ?? "");
  const [categorie, setCategorie] = useState(budgetCats[0] ?? "Investissement");
  const [isStockInitial, setIsStockInitial] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function openDialog() {
    setType("Achat");
    setClasse("ETF");
    setCompte(accounts[0]?.["Banque"] ?? "");
    setCategorie(budgetCats[0] ?? "Investissement");
    setIsStockInitial(false);
    setError("");
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("type", type);
    fd.set("classe", classe);
    fd.set("compte", compte);
    fd.set("categorie", categorie);
    fd.set("isStockInitial", String(isStockInitial));
    fd.set("date", isoToAppDate(fd.get("date") as string));
    startTransition(async () => {
      const res = await addInvestTransaction(fd);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={openDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
        <Plus size={15} /> Nouvelle opération
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle transaction d&apos;investissement</DialogTitle>
          </DialogHeader>
          <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input name="date" type="date" defaultValue={today()} />
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
                <Label>Prix unitaire (CHF)</Label>
                <Input name="prix" type="number" min="0" step="0.01" placeholder="0.00" required />
              </div>
              <div className="space-y-1.5">
                <Label>Frais transaction (CHF)</Label>
                <Input name="frais" type="number" min="0" step="0.01" defaultValue="0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>TER — frais annuels du fond (%)</Label>
                <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">Important</span>
              </div>
              <Input
                name="ter"
                type="number"
                min="0"
                step="0.01"
                placeholder="ex: 0.07 pour un ETF S&P 500, 1.50 pour un fond actif"
              />
              <p className="text-xs text-slate-400">
                Frais prélevés automatiquement dans le fond chaque année (invisible sur ton relevé).
                Trouve ce chiffre sur le site de l&apos;émetteur ou sur justETF.com.
                Laisse vide si inconnu.
              </p>
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

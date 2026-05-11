"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { addEnvelope, updateEnvelope, deleteEnvelope } from "@/lib/actions/envelopes";

export const ENVELOPE_COLORS = [
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#0ea5e9", label: "Bleu" },
  { hex: "#10b981", label: "Vert" },
  { hex: "#f59e0b", label: "Ambre" },
  { hex: "#f43f5e", label: "Rose" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#14b8a6", label: "Teal" },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {ENVELOPE_COLORS.map((c) => (
        <button
          key={c.hex}
          type="button"
          title={c.label}
          onClick={() => onChange(c.hex)}
          className="h-7 w-7 rounded-full border-2 transition-all"
          style={{
            background: c.hex,
            borderColor: value === c.hex ? "#1e293b" : "transparent",
            transform: value === c.hex ? "scale(1.2)" : "scale(1)",
          }}
        />
      ))}
    </div>
  );
}

// ── Shared form fields ──────────────────────────────────────────────
function EnvelopeFields({
  accounts,
  couleur,
  setCouleur,
  defaultCompte,
}: {
  accounts: Record<string, string>[];
  couleur: string;
  setCouleur: (v: string) => void;
  defaultCompte?: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nom</Label>
          <Input name="nom" placeholder="ex: Vacances, Impôts…" required />
        </div>
        <div className="space-y-1.5">
          <Label>Compte lié</Label>
          <Select name="compte_lie" defaultValue={defaultCompte ?? accounts[0]?.["Banque"]}>
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
          <Label>Objectif (CHF)</Label>
          <Input name="objectif" type="number" min="0" step="0.01" defaultValue="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Contribution mensuelle (CHF)</Label>
          <Input name="contribution_mensuelle" type="number" min="0" step="0.01" defaultValue="0" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Date butoir (optionnel)</Label>
        <Input name="date_butoir" type="date" />
      </div>
      <div className="space-y-1.5">
        <Label>Couleur</Label>
        <ColorPicker value={couleur} onChange={setCouleur} />
        <input type="hidden" name="couleur" value={couleur} />
      </div>
    </>
  );
}

// ── Add envelope ────────────────────────────────────────────────────
export function AddEnvelopeDialog({
  accounts,
  defaultCompte,
}: {
  accounts: Record<string, string>[];
  defaultCompte?: string;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [couleur, setCouleur] = useState("#6366f1");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function openDialog() {
    setCouleur("#6366f1");
    setError("");
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addEnvelope(fd);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={openDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
        <Plus size={15} /> Ajouter une enveloppe
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nouvelle enveloppe d&apos;épargne</DialogTitle></DialogHeader>
          <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
            <EnvelopeFields accounts={accounts} couleur={couleur} setCouleur={setCouleur} defaultCompte={defaultCompte} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {isPending ? "Enregistrement…" : "Créer l'enveloppe"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Edit envelope ───────────────────────────────────────────────────
export function EditEnvelopeDialog({
  envelope,
}: {
  envelope: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [couleur, setCouleur] = useState(envelope["couleur"] || "#6366f1");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Convert dd/mm/yyyy → yyyy-mm-dd for input[type=date]
  const dateValue = (() => {
    const raw = envelope["date_butoir"];
    if (!raw) return "";
    const [d, m, y] = raw.split("/");
    return y && m && d ? `${y}-${m}-${d}` : "";
  })();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("id", envelope["id"]);
    startTransition(async () => {
      const res = await updateEnvelope(fd);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="opacity-40 hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
        title="Modifier"
      >
        <Pencil size={13} className="text-slate-500" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Modifier — {envelope["nom"]}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input name="nom" defaultValue={envelope["nom"]} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Montant actuel (CHF)</Label>
                <Input name="montant_actuel" type="number" step="0.01" defaultValue={envelope["montant_actuel"]} />
              </div>
              <div className="space-y-1.5">
                <Label>Objectif (CHF)</Label>
                <Input name="objectif" type="number" min="0" step="0.01" defaultValue={envelope["objectif"]} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contribution mensuelle (CHF)</Label>
                <Input name="contribution_mensuelle" type="number" min="0" step="0.01" defaultValue={envelope["contribution_mensuelle"]} />
              </div>
              <div className="space-y-1.5">
                <Label>Date butoir</Label>
                <Input name="date_butoir" type="date" defaultValue={dateValue} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <ColorPicker value={couleur} onChange={setCouleur} />
              <input type="hidden" name="couleur" value={couleur} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {isPending ? "…" : "Enregistrer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Delete envelope ─────────────────────────────────────────────────
export function DeleteEnvelopeDialog({ envelope }: { envelope: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteEnvelope(envelope["id"]);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="opacity-40 hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all"
        title="Supprimer"
      >
        <Trash2 size={13} className="text-red-400" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Supprimer — {envelope["nom"]}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Le solde de <span className="font-semibold">{parseFloat(envelope["montant_actuel"] || "0").toFixed(2)} CHF</span> sera
              libéré et retournera dans ton solde non alloué.
            </p>
            <p className="text-xs text-slate-400">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Annuler</Button>
              <Button disabled={isPending} onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                {isPending ? "…" : "Supprimer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

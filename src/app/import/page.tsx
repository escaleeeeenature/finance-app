export const dynamic = "force-dynamic";

import { Upload, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportWizard } from "@/components/import-wizard";
import { BankImportWizard } from "@/components/bank-import-wizard";
import { readSheet } from "@/lib/sheets";

export default async function ImportPage() {
  const accounts = await readSheet("Comptes");
  const activeAccounts = accounts
    .filter((a) => a["Statut"] === "Actif")
    .map((a) => ({ nom: a["Banque"] || a["Nom"] || "Compte" }));

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Swissquote */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Upload size={20} className="text-indigo-500" />
          <h1 className="text-xl font-bold text-slate-900">Import Swissquote</h1>
          <span className="text-xs text-slate-400 ml-1">Investissements · Frais · Dividendes</span>
        </div>
        <ImportWizard />
      </div>

      {/* Relevés bancaires */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={20} className="text-sky-500" />
          <h1 className="text-xl font-bold text-slate-900">Import relevés bancaires</h1>
          <span className="text-xs text-slate-400 ml-1">Revolut CSV · BCJ PDF</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Revolut</CardTitle>
              <p className="text-xs text-slate-400">
                App Revolut → ton compte → icône ↓ → &quot;Exporter les transactions&quot; → CSV
              </p>
            </CardHeader>
            <CardContent>
              <BankImportWizard accounts={activeAccounts} bank="revolut" />
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">BCJ</CardTitle>
              <p className="text-xs text-slate-400">
                E-banking BCJ → Compte courant → Télécharger l&apos;extrait → PDF
              </p>
            </CardHeader>
            <CardContent>
              <BankImportWizard accounts={activeAccounts} bank="bcj" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

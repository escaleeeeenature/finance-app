export const dynamic = "force-dynamic";

import { Upload } from "lucide-react";
import { ImportWizard } from "@/components/import-wizard";

export default function ImportPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Upload size={22} className="text-indigo-500" />
          Import Swissquote
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Importe tes transactions directement depuis ton relevé Swissquote
        </p>
      </div>

      <ImportWizard />
    </div>
  );
}

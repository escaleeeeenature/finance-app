"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Info, TrendingDown } from "lucide-react";

function fmtCHF(n: number) {
  return n.toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " CHF";
}

type ClasseFeeData = {
  classe: string;
  valeur: number;
  txFees: number;       // frais de transaction sur l'année
  custodyFees: number;  // droits de garde attribués
  terCost: number;      // coût TER annualisé (TER% × valeur)
  totalAnnual: number;
  rate: number;         // taux total annualisé (%)
  hasTer: boolean;      // au moins un actif a un TER renseigné
};

const BENCHMARKS: Record<string, { excellent: number; correct: number; eleve: number; label: string }> = {
  ETF:      { excellent: 0.3,  correct: 0.7,  eleve: 1.5,  label: "ETF" },
  Fonds:    { excellent: 1.0,  correct: 1.5,  eleve: 2.5,  label: "Fonds actifs" },
  Crypto:   { excellent: 0.5,  correct: 1.0,  eleve: 2.0,  label: "Crypto" },
  Actions:  { excellent: 0.3,  correct: 0.7,  eleve: 1.5,  label: "Actions" },
  default:  { excellent: 0.5,  correct: 1.0,  eleve: 2.0,  label: "" },
};

function getVerdict(rate: number, classe: string) {
  const bench = BENCHMARKS[classe] ?? BENCHMARKS.default;
  if (rate === 0) return { label: "Pas de données", color: "text-slate-400", bg: "bg-slate-50", icon: Info };
  if (rate <= bench.excellent) return { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle };
  if (rate <= bench.correct)  return { label: "Correct",   color: "text-sky-600",     bg: "bg-sky-50",     icon: Info };
  if (rate <= bench.eleve)    return { label: "Élevé",     color: "text-amber-600",   bg: "bg-amber-50",   icon: AlertTriangle };
  return                               { label: "Excessif",  color: "text-red-600",     bg: "bg-red-50",     icon: AlertTriangle };
}

function getBenchmarkText(classe: string) {
  const bench = BENCHMARKS[classe] ?? BENCHMARKS.default;
  return `Référence : < ${bench.excellent}% excellent · < ${bench.correct}% correct · > ${bench.eleve}% excessif`;
}

export function FeeAnalysis({ data, totalValeur }: { data: ClasseFeeData[]; totalValeur: number }) {
  if (data.length === 0) return null;

  const totalAnnual = data.reduce((s, d) => s + d.totalAnnual, 0);
  const totalRate = totalValeur > 0 ? (totalAnnual / totalValeur) * 100 : 0;
  const cost10y = totalAnnual * 10 * 1.05; // rough projection with 5% growth

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <TrendingDown size={15} className="text-amber-500" />
          Analyse des frais
        </CardTitle>
        <p className="text-xs text-slate-400">Coût total annualisé par classe · frais tx + droits de garde + TER fond</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résumé global */}
        <div className="flex gap-4 p-3 bg-slate-50 rounded-xl flex-wrap">
          <div>
            <p className="text-xs text-slate-400">Coût total annuel estimé</p>
            <p className="text-lg font-bold text-slate-800 tabular-nums">{fmtCHF(totalAnnual)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Taux global</p>
            <p className={`text-lg font-bold tabular-nums ${totalRate > 1 ? "text-red-600" : totalRate > 0.5 ? "text-amber-600" : "text-emerald-600"}`}>
              {totalRate.toFixed(2)}%/an
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Coût projeté sur 10 ans</p>
            <p className="text-lg font-bold text-slate-800 tabular-nums">~{fmtCHF(cost10y)}</p>
          </div>
        </div>

        {/* Détail par classe */}
        <div className="space-y-3">
          {data.map((d) => {
            const verdict = getVerdict(d.rate, d.classe);
            const VerdictIcon = verdict.icon;
            return (
              <div key={d.classe} className="border border-slate-100 rounded-xl overflow-hidden">
                {/* Header classe */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">{d.classe}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${verdict.bg} ${verdict.color}`}>
                      <VerdictIcon size={11} />
                      {verdict.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${d.rate > 1 ? "text-red-600" : d.rate > 0.5 ? "text-amber-600" : "text-emerald-600"}`}>
                      {d.rate.toFixed(2)}%/an
                    </span>
                    <span className="text-xs text-slate-400 ml-2">({fmtCHF(d.totalAnnual)}/an)</span>
                  </div>
                </div>

                {/* Détail lignes */}
                <div className="px-4 py-2 space-y-1.5">
                  {d.txFees > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Frais de transaction ({new Date().getFullYear()})</span>
                      <span className="text-slate-700 tabular-nums font-medium">{fmtCHF(d.txFees)}</span>
                    </div>
                  )}
                  {d.custodyFees > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Droits de garde (part attribuée)</span>
                      <span className="text-slate-700 tabular-nums font-medium">{fmtCHF(d.custodyFees)}</span>
                    </div>
                  )}
                  {d.hasTer && d.terCost > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">TER fond (frais internes annualisés)</span>
                      <span className="text-slate-700 tabular-nums font-medium">{fmtCHF(d.terCost)}</span>
                    </div>
                  )}
                  {!d.hasTer && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-500">
                      <Info size={11} />
                      TER non renseigné — coût réel sous-estimé. Ajoute-le lors de la prochaine opération.
                    </div>
                  )}
                  <div className="pt-1 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400">{getBenchmarkText(d.classe)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-300">
          Droits de garde répartis proportionnellement par valeur de classe · TER appliqué à la valeur actuelle
        </p>
      </CardContent>
    </Card>
  );
}

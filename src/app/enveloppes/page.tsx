export const dynamic = "force-dynamic";

import { readSheet } from "@/lib/sheets";
import { parseNum, fmtCHF, toMoisStr } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CalendarClock, PiggyBank } from "lucide-react";
import { AddEnvelopeDialog, EditEnvelopeDialog, DeleteEnvelopeDialog } from "@/components/envelope-forms";
import { EnvelopeTransferDialog } from "@/components/envelope-transfer";
import Link from "next/link";

function daysBetween(dateStr: string): number | null {
  if (!dateStr) return null;
  // dateStr is dd/mm/yyyy
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const target = new Date(+y, +m - 1, +d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export default async function EnveloppesPage() {
  const [envelopes, accounts] = await Promise.all([
    readSheet("Enveloppes"),
    readSheet("Comptes"),
  ]);

  const activeAccounts = accounts.filter((a) => a["Statut"] === "Actif");
  const activeEnvelopes = envelopes.filter((e) => e["actif"] !== "false");

  const now = new Date();
  const currentMonth = toMoisStr(now);

  // Total épargne fléchée
  const totalEpargne = activeEnvelopes.reduce(
    (s, e) => s + parseNum(e["montant_actuel"]),
    0
  );

  // Total des soldes des comptes actifs
  const totalComptes = activeAccounts.reduce(
    (s, a) => s + parseNum(a["Solde_Initial"]),
    0
  );

  // Non alloué = solde total comptes - épargne fléchée
  const nonAlloue = totalComptes - totalEpargne;

  // Contribution mensuelle totale
  const totalContrib = activeEnvelopes.reduce(
    (s, e) => s + parseNum(e["contribution_mensuelle"]),
    0
  );

  // Sort envelopes: those with date_butoir first (ascending), then without
  const sorted = [...activeEnvelopes].sort((a, b) => {
    const daysA = daysBetween(a["date_butoir"]);
    const daysB = daysBetween(b["date_butoir"]);
    if (daysA !== null && daysB !== null) return daysA - daysB;
    if (daysA !== null) return -1;
    if (daysB !== null) return 1;
    return 0;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <PiggyBank size={22} className="text-indigo-500" />
            Enveloppes d&apos;épargne
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{currentMonth}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <EnvelopeTransferDialog envelopes={activeEnvelopes} mois={currentMonth} />
          <AddEnvelopeDialog accounts={activeAccounts} />
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Épargne fléchée
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {fmtCHF(totalEpargne)}
            </p>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm ${nonAlloue < 0 ? "ring-2 ring-red-400" : ""}`}>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Non alloué
            </p>
            <p className={`text-2xl font-bold tabular-nums ${nonAlloue < 0 ? "text-red-500" : "text-emerald-600"}`}>
              {fmtCHF(nonAlloue)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Contrib. mensuelle
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {fmtCHF(totalContrib)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Non-alloué alert */}
      {nonAlloue < 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium">
            Attention : ton épargne fléchée ({fmtCHF(totalEpargne)}) dépasse le solde de tes comptes
            ({fmtCHF(totalComptes)}). Solde non alloué négatif de {fmtCHF(nonAlloue)}.
          </p>
        </div>
      )}

      {/* Envelope cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <PiggyBank size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune enveloppe. Crée-en une !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sorted.map((env) => {
            const montant = parseNum(env["montant_actuel"]);
            const objectif = parseNum(env["objectif"]);
            const pct = objectif > 0 ? Math.min(Math.round((montant / objectif) * 100), 100) : 0;
            const couleur = env["couleur"] || "#6366f1";
            const days = daysBetween(env["date_butoir"]);
            const bientot = days !== null && days >= 0 && days <= 30;
            const depasse = days !== null && days < 0;

            return (
              <Card key={env["id"]} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-3.5 w-3.5 rounded-full shrink-0"
                        style={{ background: couleur }}
                      />
                      <span className="font-semibold text-slate-800 truncate">{env["nom"]}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {bientot && (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-0">
                          <CalendarClock size={10} className="mr-0.5" /> Bientôt
                        </Badge>
                      )}
                      {depasse && (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 border-0">
                          Dépassé
                        </Badge>
                      )}
                      <EditEnvelopeDialog envelope={env} />
                      <DeleteEnvelopeDialog envelope={env} />
                    </div>
                  </div>

                  {/* Progress bar */}
                  {objectif > 0 ? (
                    <div className="space-y-1">
                      <div
                        className="h-2 rounded-full overflow-hidden bg-slate-100"
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: couleur }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 tabular-nums">
                        <span>{fmtCHF(montant)}</span>
                        <span>{pct}% — objectif {fmtCHF(objectif)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-slate-700 tabular-nums">
                      {fmtCHF(montant)}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    {env["contribution_mensuelle"] && parseNum(env["contribution_mensuelle"]) > 0 ? (
                      <span>+{fmtCHF(parseNum(env["contribution_mensuelle"]))} / mois</span>
                    ) : (
                      <span />
                    )}
                    {env["date_butoir"] && (
                      <span className="flex items-center gap-1">
                        <CalendarClock size={11} />
                        {env["date_butoir"]}
                        {days !== null && days >= 0 && (
                          <span className="ml-1 text-slate-300">({days}j)</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Linked account */}
                  {env["compte_lie"] && (
                    <p className="text-[11px] text-slate-300 truncate">
                      Compte : {env["compte_lie"]}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

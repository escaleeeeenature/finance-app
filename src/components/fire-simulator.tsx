"use client";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Flame, Target, CalendarCheck, TrendingUp } from "lucide-react";

function fmtCHF(n: number) {
  return n.toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " CHF";
}

function projectPatrimoine(
  patrimoineInitial: number,
  epargneMensuelle: number,
  rendementAnnuel: number,
  capitalCible: number,
  maxYears = 60
) {
  const monthlyRate = Math.pow(1 + rendementAnnuel / 100, 1 / 12) - 1;
  const data: { label: string; year: number; patrimoine: number; cible: number }[] = [];
  let patrimoine = patrimoineInitial;
  let fireMonth: number | null = null;

  for (let month = 0; month <= maxYears * 12; month++) {
    if (fireMonth === null && patrimoine >= capitalCible && capitalCible > 0) {
      fireMonth = month;
    }
    if (month % 12 === 0) {
      const year = month / 12;
      data.push({
        year,
        label: year === 0 ? "Auj." : `+${year}a`,
        patrimoine: Math.round(patrimoine),
        cible: Math.round(capitalCible),
      });
      // Stop chart 5 years after FIRE to keep it readable
      if (fireMonth !== null && month >= fireMonth + 60) break;
    }
    patrimoine = patrimoine * (1 + monthlyRate) + epargneMensuelle;
  }

  return { data, fireMonth };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs space-y-1.5 min-w-[180px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="tabular-nums font-semibold text-slate-800">
            {Number(p.value).toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CHF
          </span>
        </div>
      ))}
    </div>
  );
};

function SliderInput({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-bold text-indigo-600 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export function FireSimulator({
  patrimoineActuel,
  depensesMoyennes,
  revenusMoyens,
  age,
}: {
  patrimoineActuel: number;
  depensesMoyennes: number;
  revenusMoyens: number;
  age: number;
}) {
  const [rendement, setRendement] = useState(7);
  const [depenses, setDepenses] = useState(Math.round(depensesMoyennes));
  const [epargne, setEpargne] = useState(Math.max(0, Math.round(revenusMoyens - depensesMoyennes)));
  const [tauxRetrait, setTauxRetrait] = useState(4);
  const [ageActuel, setAgeActuel] = useState(age);

  const capitalCible = depenses > 0 ? Math.round((depenses * 12) / (tauxRetrait / 100)) : 0;

  const { data, fireMonth } = useMemo(
    () => projectPatrimoine(patrimoineActuel, epargne, rendement, capitalCible),
    [patrimoineActuel, epargne, rendement, capitalCible]
  );

  const fireYears = fireMonth !== null ? Math.floor(fireMonth / 12) : null;
  const fireMonthsRem = fireMonth !== null ? fireMonth % 12 : null;
  const fireDate = fireMonth !== null
    ? new Date(Date.now() + fireMonth * 30.44 * 24 * 3600 * 1000)
    : null;
  const fireAge = fireDate ? ageActuel + (fireDate.getFullYear() - new Date().getFullYear()) : null;

  const progressPct = capitalCible > 0
    ? Math.min(Math.round((patrimoineActuel / capitalCible) * 100), 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-indigo-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capital FIRE</p>
            </div>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{fmtCHF(capitalCible)}</p>
            <p className="text-xs text-slate-400 mt-0.5">règle des {tauxRetrait}%</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-emerald-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Progression</p>
            </div>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{progressPct}%</p>
            <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck size={14} className="text-amber-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Temps restant</p>
            </div>
            {fireYears !== null ? (
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {fireYears}a {fireMonthsRem}m
              </p>
            ) : (
              <p className="text-sm text-slate-400">Non atteignable</p>
            )}
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm ${fireDate ? "bg-gradient-to-br from-indigo-50 to-violet-50" : ""}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={14} className="text-orange-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date FIRE</p>
            </div>
            {fireDate ? (
              <>
                <p className="text-xl font-bold text-indigo-700 tabular-nums">
                  {fireDate.toLocaleDateString("fr-CH", { month: "short", year: "numeric" })}
                </p>
                <p className="text-xs text-indigo-400 mt-0.5">à {fireAge} ans</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SliderInput
              label="Dépenses mensuelles"
              value={depenses}
              min={500}
              max={15000}
              step={100}
              onChange={setDepenses}
              format={(v) => `${v.toLocaleString("fr-CH")} CHF`}
            />
            <SliderInput
              label="Épargne mensuelle"
              value={epargne}
              min={0}
              max={10000}
              step={50}
              onChange={setEpargne}
              format={(v) => `${v.toLocaleString("fr-CH")} CHF`}
            />
            <SliderInput
              label="Rendement annuel estimé"
              value={rendement}
              min={1}
              max={15}
              step={0.5}
              onChange={setRendement}
              format={(v) => `${v}%`}
            />
            <SliderInput
              label="Taux de retrait sécurisé"
              value={tauxRetrait}
              min={3}
              max={6}
              step={0.5}
              onChange={setTauxRetrait}
              format={(v) => `${v}%`}
            />
            <SliderInput
              label="Ton âge actuel"
              value={ageActuel}
              min={18}
              max={60}
              step={1}
              onChange={setAgeActuel}
              format={(v) => `${v} ans`}
            />

            {/* Info box */}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700 space-y-1">
              <p className="font-semibold">Règle des {tauxRetrait}%</p>
              <p>
                Capital cible = dépenses annuelles ÷ {tauxRetrait}%<br />
                = {fmtCHF(depenses * 12)} ÷ {tauxRetrait / 100} = <strong>{fmtCHF(capitalCible)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Projection vers l&apos;indépendance financière
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            {capitalCible > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <ReferenceLine
                    y={capitalCible}
                    stroke="#f59e0b"
                    strokeDasharray="6 3"
                    strokeWidth={2}
                    label={{ value: "🎯 FIRE", position: "insideTopRight", fontSize: 11, fill: "#d97706" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="patrimoine"
                    name="Patrimoine projeté"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                Ajuste tes dépenses pour voir la projection
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

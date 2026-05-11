"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function BudgetMonthSelector({ months, selected }: { months: string[]; selected: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mois", e.target.value);
    router.push(`/budget?${params.toString()}`);
  }

  return (
    <select
      value={selected}
      onChange={onChange}
      className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    >
      {months.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  );
}

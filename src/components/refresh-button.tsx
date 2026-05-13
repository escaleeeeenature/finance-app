"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    router.refresh();
    // Give a moment for the refresh to complete visually
    setTimeout(() => setLoading(false), 1200);
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all disabled:opacity-50"
    >
      <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
      {loading ? "Actualisation…" : "Actualiser"}
    </button>
  );
}

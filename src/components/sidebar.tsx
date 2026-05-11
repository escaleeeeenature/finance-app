"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ArrowLeftRight, Target,
  TrendingUp, Landmark, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",    label: "Tableau de Bord",  icon: LayoutDashboard },
  { href: "/expenses",     label: "Dépenses",          icon: ArrowLeftRight },
  { href: "/budget",       label: "Budget",            icon: Target },
  { href: "/investments",  label: "Investissements",   icon: TrendingUp },
  { href: "/accounts",     label: "Comptes Bancaires", icon: Landmark },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-60 flex-col bg-slate-900 text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg shadow-lg">
          💰
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">MonApp</p>
          <p className="text-[11px] text-slate-400 leading-tight">Finance</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Navigation
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Google Sheets connecté
        </div>
      </div>
    </aside>
  );
}

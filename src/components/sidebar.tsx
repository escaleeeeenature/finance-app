"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ArrowLeftRight, Target,
  TrendingUp, Landmark, ChevronLeft, ChevronRight, Menu, X, PiggyBank, Flame, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",   label: "Tableau de Bord",  icon: LayoutDashboard },
  { href: "/expenses",    label: "Dépenses",          icon: ArrowLeftRight },
  { href: "/budget",      label: "Budget",            icon: Target },
  { href: "/investments", label: "Investissements",   icon: TrendingUp },
  { href: "/accounts",    label: "Comptes Bancaires", icon: Landmark },
  { href: "/enveloppes",  label: "Enveloppes",        icon: PiggyBank },
  { href: "/fire",        label: "Simulateur FIRE",   icon: Flame },
  { href: "/import",      label: "Import Swissquote", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false); // desktop
  const [mobileOpen, setMobileOpen] = useState(false); // mobile

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              collapsed ? "justify-center" : "",
              active
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon size={17} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 flex md:hidden items-center justify-center h-9 w-9 rounded-xl bg-slate-900 text-white shadow-lg"
      >
        <Menu size={18} />
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* drawer */}
          <aside className="relative flex h-full w-64 flex-col bg-slate-900 text-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg shadow-lg">
                  💰
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight">MonApp</p>
                  <p className="text-[11px] text-slate-400 leading-tight">Finance</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Navigation
              </p>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="px-3 py-4 border-t border-slate-800">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Google Sheets connecté
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "hidden md:flex h-full flex-col bg-slate-900 text-white shrink-0 transition-all duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center border-b border-slate-800 py-5",
          collapsed ? "justify-center px-0" : "gap-3 px-5"
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg shadow-lg shrink-0">
            💰
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm leading-tight">MonApp</p>
              <p className="text-[11px] text-slate-400 leading-tight">Finance</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {!collapsed && (
            <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Navigation
            </p>
          )}
          <NavLinks />
        </nav>

        {/* Footer + collapse toggle */}
        <div className="px-2 py-4 border-t border-slate-800 space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Google Sheets connecté
            </div>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-slate-800 transition-all",
              collapsed ? "justify-center" : ""
            )}
          >
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /> Réduire</>}
          </button>
        </div>
      </aside>
    </>
  );
}

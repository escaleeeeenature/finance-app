import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(value: number, decimals = 2): string {
  return new Intl.NumberFormat("fr-CH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function fmtCHF(value: number): string {
  return `${fmt(value)} CHF`;
}

export const FR_MONTHS: Record<number, string> = {
  1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril", 5: "Mai", 6: "Juin",
  7: "Juillet", 8: "Août", 9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
};

export function toMoisStr(date: Date): string {
  return `${FR_MONTHS[date.getMonth() + 1]} ${date.getFullYear()}`;
}

export function parseNum(val: string | number | undefined): number {
  if (val === undefined || val === "") return 0;
  const str = String(val).replace(/'/g, "").replace(/\s/g, "").replace(",", ".");
  return parseFloat(str) || 0;
}

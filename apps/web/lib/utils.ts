import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("pl-PL");
}

export function formatPercent(n: number | null | undefined, decimals = 1): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(decimals)}%`;
}

export function getMonthName(month: number): string {
  const names = ["", "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
  return names[month] ?? String(month);
}

export function getChangeColor(change: number | null | undefined): string {
  if (change == null) return "text-gray-500";
  if (change > 0) return "text-green-600";
  if (change < 0) return "text-red-500";
  return "text-gray-500";
}

export function getPositionChangeBadge(change: number | null | undefined) {
  if (change == null || change === 0) return null;
  const isUp = change > 0;
  return { isUp, label: `${isUp ? "+" : ""}${change}` };
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: string | number | null | undefined, currency = "INR") {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatQty(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function statusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  const s = status.toLowerCase();
  if (["confirmed", "posted", "completed", "pass", "active"].includes(s)) return "success";
  if (["draft", "pending", "in_progress"].includes(s)) return "warning";
  if (["fail", "cancelled", "rejected"].includes(s)) return "danger";
  return "neutral";
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (value?: string | Date, locale = "en-US") => {
  if (!value) return "—";
  try {
    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Show relative time for recent dates
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    // Show full date for older items
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
};

export const safeJson = <T>(value: unknown, fallback: T): T => {
  try {
    if (typeof value === "string") {
      return JSON.parse(value) as T;
    }
    if (typeof value === "object" && value !== null) {
      return value as T;
    }
  } catch {
    // ignore
  }
  return fallback;
};


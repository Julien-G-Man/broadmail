import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "draft": return "bg-gray-100 text-gray-700";
    case "scheduled": return "bg-blue-100 text-blue-700";
    case "queued": return "bg-yellow-100 text-yellow-700";
    case "sending": return "bg-orange-100 text-orange-700";
    case "sent": return "bg-green-100 text-green-700";
    case "failed": return "bg-red-100 text-red-700";
    case "cancelled": return "bg-gray-100 text-gray-500";
    default: return "bg-gray-100 text-gray-700";
  }
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitial = (name?: string | null, email?: string | null) => {
  const value = String(name || email || '?').trim();
  return value.charAt(0).toUpperCase();
};

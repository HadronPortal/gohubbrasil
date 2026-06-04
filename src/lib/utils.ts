import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitial = (name?: string | null, email?: string | null) => {
  const value = String(name || email || '?').trim();
  return value.charAt(0).toUpperCase();
};

export const getDateKeyBR = (value: string | number | Date) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
};

export const todayKey = getDateKeyBR(new Date());

export const isTodayBR = (startsAt: string | number | Date) =>
  getDateKeyBR(startsAt) === todayKey;

export const isAfterTodayBR = (startsAt: string | number | Date) =>
  getDateKeyBR(startsAt) > todayKey;

export const isFinished = (status?: string | null) =>
  ['completed', 'finalizado'].includes(String(status || '').toLowerCase());

export const isCanceled = (status?: string | null) =>
  ['cancelled', 'canceled', 'cancelado'].includes(String(status || '').toLowerCase());



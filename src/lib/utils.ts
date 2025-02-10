import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const zoomSelector = (s: { transform: number[]; }) => s.transform[2] >= 0.6;

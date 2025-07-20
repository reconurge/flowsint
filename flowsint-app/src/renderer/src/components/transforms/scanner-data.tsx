import type { Scanner, ScansData, ScannerData } from "@/types/transform"

// Default color for fallback cases
export const DEFAULT_COLOR = "#94a3b8"

// Colors for each category/type
export const categoryColors: Record<string, string> = {
  // Categories
  social: "#3b82f6",
  email: "#10b981",
  website: "#f59e0b",
  phone: "#8b5cf6",
  ips: "#ef4444",
  domains: "#10b981",
  type: "#f59e0b",
  cidr: "#A2D4BF",
  asn: "#F7D154",
  organization: "#9C27B0",
}

/**
 * Get the color for a scanner based on its type or category
 * @param type The scanner type
 * @param category The scanner category
 * @returns The color to use
 */
export const getScannerColor = (type?: string, category?: string): string => {
  if (type && categoryColors[type]) return categoryColors[type]
  if (category && categoryColors[category]) return categoryColors[category]
  return DEFAULT_COLOR
}
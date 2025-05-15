// Types for the scanners
export interface Scanner {
  class_name: string
  name: string
  module: string
  doc: string | null
  key: string
}

export interface ScansData {
  [category: string]: Scanner[]
}

export interface ScannerData {
  items: ScansData
}

// Colors for each category
export const categoryColors: Record<string, string> = {
  social_profile: "#3b82f6",
  emails: "#10b981",
  websites: "#f59e0b",
  phones: "#8b5cf6",
  ips: "#ef4444",
  domains: "#10b981",
  type: "#f59e0b",
}
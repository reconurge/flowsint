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
    social_account: "#3b82f6", // blue-500
    emails: "#10b981", // emerald-500
    websites: "#f59e0b", // amber-500
    phones: "#8b5cf6", // violet-500
    leaks: "#ef4444", // red-500
  }
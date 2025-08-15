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

// Graph viewer specific colors
export const GRAPH_COLORS = {
  // Link colors
  LINK_DEFAULT: 'rgba(128, 128, 128, 0.6)',
  LINK_HIGHLIGHTED: 'rgba(255, 115, 0, 0.68)',
  LINK_DIMMED: 'rgba(133, 133, 133, 0.23)',
  LINK_LABEL_HIGHLIGHTED: 'rgba(255, 115, 0, 0.9)',
  LINK_LABEL_DEFAULT: 'rgba(180, 180, 180, 0.75)',
  
  // Node highlight colors
  NODE_HIGHLIGHT_HOVER: 'rgba(255, 0, 0, 0.3)',
  NODE_HIGHLIGHT_DEFAULT: 'rgba(255, 165, 0, 0.3)',
  
  // Text colors
  TEXT_LIGHT: '#161616',
  TEXT_DARK: '#FFFFFF',
  
  // Background colors
  BACKGROUND_LIGHT: "#FFFFFF",
  BACKGROUND_DARK: '#161616',
  
  // Transparent colors
  TRANSPARENT: "#00000000",
  
  // Default node color
  NODE_DEFAULT: '#0074D9',
} as const

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
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
  LASSO_FILL: 'rgba(255, 115, 0, 0.07)',
  LASSO_STROKE: 'rgba(255, 115, 0, 0.56)',
  // Text colors
  TEXT_LIGHT: '#161616',
  TEXT_DARK: '#FFFFFF',
  // Background colors
  BACKGROUND_LIGHT: '#FFFFFF',
  BACKGROUND_DARK: '#161616',
  // Transparent colors
  TRANSPARENT: '#00000000',
  // Default node color
  NODE_DEFAULT: '#0074D9'
} as const

export const CONSTANTS = {
  NODE_DEFAULT_SIZE: 5,
  LABEL_FONT_SIZE: 2.5,
  NODE_FONT_SIZE: 3.5,
  PADDING_RATIO: 0.2,
  HALF_PI: Math.PI / 2,
  PI: Math.PI,
  MIN_FONT_SIZE: 0.5,
  LINK_WIDTH: 1,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 12,
  ZOOM_NODE_DETAIL_THRESHOLD: 2,
  ZOOM_EDGE_DETAIL_THRESHOLD: 1,
  ZOOMED_OUT_SIZE_MULTIPLIER: 2.5
}

// Reusable objects to avoid allocations
export const tempPos = { x: 0, y: 0 }
export const tempDimensions = [0, 0]

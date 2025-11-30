import { GRAPH_CONSTANTS } from '../constants'

/**
 * Convert CSS color string to Pixi.js hexadecimal color
 *
 * @param cssColor - CSS color string (e.g., "#FF5733")
 * @returns Hexadecimal color number
 */
export function cssToPixiColor(cssColor: string): number {
  return parseInt(cssColor.replace('#', ''), 16)
}

/**
 * Convert hexadecimal color to CSS color string
 *
 * @param hexColor - Hexadecimal color number
 * @returns CSS color string
 */
export function pixiToCssColor(hexColor: number): string {
  return `#${hexColor.toString(16).padStart(6, '0')}`
}

/**
 * Get node color based on state (hover, highlight, default)
 *
 * @param baseColor - Base color of the node (hex number)
 * @param isHovered - Whether the node is hovered
 * @param isHighlighted - Whether the node is highlighted
 * @param hasAnyHighlight - Whether any node is highlighted
 * @returns Color object with color and alpha
 */
export function getNodeColor(
  baseColor: number,
  isHovered: boolean,
  isHighlighted: boolean,
  hasAnyHighlight: boolean
): { color: number; alpha: number } {
  if (isHovered) {
    return {
      color: GRAPH_CONSTANTS.HOVER_COLOR,
      alpha: GRAPH_CONSTANTS.HIGHLIGHTED_ALPHA,
    }
  }

  if (hasAnyHighlight) {
    if (isHighlighted) {
      return {
        color: baseColor,
        alpha: GRAPH_CONSTANTS.HIGHLIGHTED_ALPHA,
      }
    } else {
      return {
        color: baseColor,
        alpha: GRAPH_CONSTANTS.DIMMED_ALPHA,
      }
    }
  }

  return {
    color: baseColor,
    alpha: GRAPH_CONSTANTS.HIGHLIGHTED_ALPHA,
  }
}

/**
 * Get edge color and alpha based on highlight state
 *
 * @param isHighlighted - Whether the edge is highlighted
 * @param hasAnyHighlight - Whether any edge/node is highlighted
 * @returns Style object with color, alpha, and width multiplier
 */
export function getEdgeStyle(
  isHighlighted: boolean,
  hasAnyHighlight: boolean
): { color: number; alpha: number; widthMultiplier: number } {
  if (isHighlighted) {
    return {
      color: GRAPH_CONSTANTS.HOVER_COLOR,
      alpha: GRAPH_CONSTANTS.LINK_HIGHLIGHTED_ALPHA,
      widthMultiplier: 1 / 3,
    }
  }

  if (hasAnyHighlight) {
    return {
      color: GRAPH_CONSTANTS.LINK_DIMMED_COLOR,
      alpha: GRAPH_CONSTANTS.LINK_DIMMED_ALPHA,
      widthMultiplier: 1 / 5,
    }
  }

  return {
    color: GRAPH_CONSTANTS.LINK_DEFAULT_COLOR,
    alpha: GRAPH_CONSTANTS.LINK_DEFAULT_ALPHA,
    widthMultiplier: 1 / 5,
  }
}

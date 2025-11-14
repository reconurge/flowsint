import { GRAPH_CONSTANTS } from '../constants'
import type { SimulationNode } from '../types/graph.types'

/**
 * Calculate which labels should be visible based on zoom level
 * Uses progressive disclosure: more labels appear as user zooms in
 *
 * @param nodes - Array of simulation nodes
 * @param zoomLevel - Current zoom level (scale factor)
 * @returns Set of node IDs whose labels should be visible
 */
export function calculateVisibleLabels(
  nodes: SimulationNode[],
  zoomLevel: number
): Set<string> {
  const totalNodes = nodes.length
  if (totalNodes === 0) return new Set<string>()

  // Clamp zoom level to valid range
  const clampedZoom = Math.max(
    GRAPH_CONSTANTS.MIN_ZOOM,
    Math.min(GRAPH_CONSTANTS.MAX_ZOOM, zoomLevel)
  )

  // Calculate zoom ratio (0 to 1)
  const zoomRatio =
    (clampedZoom - GRAPH_CONSTANTS.MIN_ZOOM) /
    (GRAPH_CONSTANTS.MAX_ZOOM - GRAPH_CONSTANTS.MIN_ZOOM)

  // Calculate maximum labels to show at this zoom level
  const maxLabelsAtZoom = Math.floor(
    GRAPH_CONSTANTS.MIN_VISIBLE_LABELS +
      zoomRatio *
        Math.min(
          totalNodes * 0.5,
          GRAPH_CONSTANTS.MAX_VISIBLE_LABELS_PER_ZOOM * clampedZoom
        )
  )

  // Create weight map (nodes sorted by connection count)
  const weightedNodes = nodes
    .map((node) => ({
      id: node.id,
      weight: node.neighbors.length,
    }))
    .sort((a, b) => b.weight - a.weight)

  // Select top N nodes based on weight
  const visibleSet = new Set<string>()
  for (let i = 0; i < Math.min(maxLabelsAtZoom, weightedNodes.length); i++) {
    visibleSet.add(weightedNodes[i].id)
  }

  return visibleSet
}

/**
 * Check if zoom level is sufficient to show edge labels
 *
 * @param zoomLevel - Current zoom level
 * @returns True if edge labels should be visible
 */
export function shouldShowEdgeLabels(zoomLevel: number): boolean {
  return zoomLevel >= GRAPH_CONSTANTS.LOD_EDGE_LABEL_MIN_ZOOM
}

/**
 * Check if zoom level is sufficient to show node icons
 *
 * @param zoomLevel - Current zoom level
 * @returns True if node icons should be visible
 */
export function shouldShowNodeIcons(zoomLevel: number): boolean {
  return zoomLevel >= GRAPH_CONSTANTS.LOD_ICON_MIN_ZOOM
}

/**
 * Check if zoom level is sufficient to show node labels
 *
 * @param zoomLevel - Current zoom level
 * @returns True if node labels should be visible
 */
export function shouldShowNodeLabels(zoomLevel: number): boolean {
  return zoomLevel >= GRAPH_CONSTANTS.LOD_NODE_LABEL_MIN_ZOOM
}

/**
 * Check if zoom level is in high detail mode
 * In high detail mode, all features are shown with maximum quality
 *
 * @param zoomLevel - Current zoom level
 * @returns True if in high detail mode
 */
export function isHighDetailMode(zoomLevel: number): boolean {
  return zoomLevel >= GRAPH_CONSTANTS.LOD_HIGH_DETAIL_ZOOM
}

/**
 * Get the current Level of Detail based on zoom level
 * Returns a string indicating the current LOD level
 *
 * @param zoomLevel - Current zoom level
 * @returns LOD level: 'minimal', 'low', 'medium', 'high'
 */
export function getLODLevel(zoomLevel: number): 'minimal' | 'low' | 'medium' | 'high' {
  if (zoomLevel >= GRAPH_CONSTANTS.LOD_HIGH_DETAIL_ZOOM) {
    return 'high' // All features visible
  } else if (zoomLevel >= GRAPH_CONSTANTS.LOD_EDGE_LABEL_MIN_ZOOM) {
    return 'medium' // Nodes, icons, node labels, and edge labels
  } else if (zoomLevel >= GRAPH_CONSTANTS.LOD_ICON_MIN_ZOOM) {
    return 'low' // Nodes, icons, and some node labels
  } else {
    return 'minimal' // Only nodes and edges
  }
}

/**
 * Calculate font size for node labels based on node size and zoom
 *
 * @param nodeSize - Size of the node
 * @param zoomLevel - Current zoom level
 * @param fontSizeSetting - Font size setting (percentage, default 50)
 * @returns Calculated font size
 */
export function calculateNodeLabelFontSize(
  nodeSize: number,
  zoomLevel: number,
  fontSizeSetting: number = 50
): number {
  const baseFontSize = Math.max(
    GRAPH_CONSTANTS.MIN_FONT_SIZE,
    (GRAPH_CONSTANTS.NODE_FONT_SIZE * (nodeSize / 2)) / zoomLevel + 2
  )
  return baseFontSize * (fontSizeSetting / 100)
}

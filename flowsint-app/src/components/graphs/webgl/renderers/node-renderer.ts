import { Graphics, Sprite } from 'pixi.js'
import { GRAPH_CONSTANTS } from '../constants'
import { getNodeColor } from '../utils/color-utils'
import type { SimulationNode } from '../types/graph.types'

/**
 * Render a node with its visual states (hover, highlight, selection)
 *
 * @param graphics - Pixi.js Graphics object to draw on
 * @param node - Node to render
 * @param nodeSize - Size of the node
 * @param isHovered - Whether the node is hovered
 * @param isHighlighted - Whether the node is highlighted
 * @param isSelected - Whether the node is selected
 * @param hasAnyHighlight - Whether any node is highlighted
 */
export function renderNode(
  graphics: Graphics,
  node: SimulationNode,
  nodeSize: number,
  isHovered: boolean,
  isHighlighted: boolean,
  isSelected: boolean,
  hasAnyHighlight: boolean
): void {
  if (!node.x || !node.y) return

  graphics.clear()

  // Draw highlight ring for selected or highlighted nodes
  if (isSelected || isHighlighted) {
    const highlightColor = isHovered
      ? GRAPH_CONSTANTS.NODE_HIGHLIGHT_HOVER
      : GRAPH_CONSTANTS.NODE_HIGHLIGHT_DEFAULT
    graphics.circle(0, 0, nodeSize * GRAPH_CONSTANTS.NODE_HIGHLIGHT_SCALE)
    graphics.fill({
      color: highlightColor,
      alpha: GRAPH_CONSTANTS.NODE_HIGHLIGHT_RING_ALPHA,
    })
  }

  // Get node color based on state
  const baseColorHex = parseInt(node.nodeColor.replace('#', ''), 16)
  const { color, alpha } = getNodeColor(
    baseColorHex,
    isHovered,
    isHighlighted,
    hasAnyHighlight
  )

  // Draw node circle
  graphics.circle(0, 0, nodeSize)
  graphics.fill({ color, alpha })

  // Draw selection border
  if (isSelected) {
    graphics.circle(0, 0, nodeSize)
    graphics.stroke({
      width: GRAPH_CONSTANTS.NODE_BORDER_WIDTH,
      color: 0xffffff,
      alpha: 1,
    })
  }

  // Update position
  graphics.position.set(node.x, node.y)
}

/**
 * Update icon sprite position and visibility
 *
 * @param sprite - Pixi.js Sprite object
 * @param node - Node associated with the sprite
 * @param nodeSize - Size of the node
 * @param isHighlighted - Whether the node is highlighted
 * @param hasAnyHighlight - Whether any node is highlighted
 */
export function updateIconSprite(
  sprite: Sprite,
  node: SimulationNode,
  nodeSize: number,
  isHighlighted: boolean,
  hasAnyHighlight: boolean
): void {
  if (!node.x || !node.y) return

  sprite.position.set(node.x, node.y)

  // Update icon size
  const iconSize = nodeSize * GRAPH_CONSTANTS.ICON_SIZE_MULTIPLIER
  sprite.width = iconSize
  sprite.height = iconSize

  // Update alpha based on highlight state
  sprite.alpha =
    hasAnyHighlight && !isHighlighted
      ? GRAPH_CONSTANTS.DIMMED_ALPHA
      : GRAPH_CONSTANTS.HIGHLIGHTED_ALPHA
}

/**
 * Calculate node size based on connection count and settings
 *
 * @param node - Node to calculate size for
 * @param nodeSizeSetting - Node size setting value (0-200)
 * @returns Calculated node size
 */
export function calculateNodeSize(
  node: SimulationNode,
  nodeSizeSetting: number
): number {
  return (
    Math.min(node.nodeSize + node.neighbors.length / 5, 20) *
    (nodeSizeSetting / 100 + 0.4)
  )
}

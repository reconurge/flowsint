import { Graphics } from 'pixi.js'
import { GRAPH_CONSTANTS } from '../constants'
import { getEdgeStyle } from '../utils/color-utils'
import type { SimulationLink, SimulationNode } from '../types/graph.types'

/**
 * Batch of edges with the same rendering style
 */
interface EdgeBatch {
  highlighted: SimulationLink[]
  dimmed: SimulationLink[]
  default: SimulationLink[]
}

/**
 * Render all edges to a Graphics object
 * Groups edges by style for optimal performance
 *
 * @param graphics - Pixi.js Graphics object to draw on
 * @param links - Array of simulation links
 * @param highlightedLinks - Set of highlighted link keys
 * @param linkWidth - Width setting for links
 */
export function renderEdges(
  graphics: Graphics,
  links: SimulationLink[],
  highlightedLinks: Set<string>,
  linkWidth: number
): void {
  graphics.clear()

  const hasAnyHighlight = highlightedLinks.size > 0

  // Batch edges by rendering style
  const batches: EdgeBatch = {
    highlighted: [],
    dimmed: [],
    default: [],
  }

  // Categorize edges
  links.forEach((link) => {
    const source = link.source as SimulationNode
    const target = link.target as SimulationNode

    if (!source.x || !source.y || !target.x || !target.y) return

    const linkKey = `${source.id}-${target.id}`
    const isHighlighted = highlightedLinks.has(linkKey)

    if (isHighlighted) {
      batches.highlighted.push(link)
    } else if (hasAnyHighlight) {
      batches.dimmed.push(link)
    } else {
      batches.default.push(link)
    }
  })

  // Render highlighted edges
  if (batches.highlighted.length > 0) {
    const style = getEdgeStyle(true, hasAnyHighlight)
    batches.highlighted.forEach((link) => {
      const source = link.source as SimulationNode
      const target = link.target as SimulationNode
      graphics.moveTo(source.x!, source.y!)
      graphics.lineTo(target.x!, target.y!)
    })
    graphics.stroke({
      width: GRAPH_CONSTANTS.LINK_WIDTH * linkWidth * style.widthMultiplier,
      color: style.color,
      alpha: style.alpha,
    })
  }

  // Render dimmed edges
  if (batches.dimmed.length > 0) {
    const style = getEdgeStyle(false, true)
    batches.dimmed.forEach((link) => {
      const source = link.source as SimulationNode
      const target = link.target as SimulationNode
      graphics.moveTo(source.x!, source.y!)
      graphics.lineTo(target.x!, target.y!)
    })
    graphics.stroke({
      width: GRAPH_CONSTANTS.LINK_WIDTH * linkWidth * style.widthMultiplier,
      color: style.color,
      alpha: style.alpha,
    })
  }

  // Render default edges
  if (batches.default.length > 0) {
    const style = getEdgeStyle(false, false)
    batches.default.forEach((link) => {
      const source = link.source as SimulationNode
      const target = link.target as SimulationNode
      graphics.moveTo(source.x!, source.y!)
      graphics.lineTo(target.x!, target.y!)
    })
    graphics.stroke({
      width: GRAPH_CONSTANTS.LINK_WIDTH * linkWidth * style.widthMultiplier,
      color: style.color,
      alpha: style.alpha,
    })
  }
}

/**
 * Create a link key for highlighting
 *
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @returns Link key string
 */
export function createLinkKey(sourceId: string, targetId: string): string {
  return `${sourceId}-${targetId}`
}

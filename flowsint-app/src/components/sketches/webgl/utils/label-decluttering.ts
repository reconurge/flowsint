import { GRAPH_CONSTANTS } from '../constants'
import { calculateNodeLabelFontSize } from './visibility-calculator'
import type { SimulationNode } from '../types/graph.types'

/**
 * Bounding box for a label in screen space
 */
export interface LabelBoundingBox {
  nodeId: string
  x: number // Center X
  y: number // Center Y (top of label)
  width: number
  height: number
  priority: number // Higher = more important
}

/**
 * Calculate the bounding box for a node label
 *
 * @param node - Simulation node
 * @param nodeSize - Visual size of the node
 * @param zoomLevel - Current zoom level
 * @param fontSizeSetting - Font size setting percentage
 * @param viewportWidth - Viewport width for spatial priority
 * @param viewportHeight - Viewport height for spatial priority
 * @param cameraX - Camera X position (for viewport centering)
 * @param cameraY - Camera Y position (for viewport centering)
 * @returns Bounding box or null if node has no position
 */
export function calculateLabelBoundingBox(
  node: SimulationNode,
  nodeSize: number,
  zoomLevel: number,
  fontSizeSetting: number,
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number = 0,
  cameraY: number = 0
): LabelBoundingBox | null {
  if (!node.x || !node.y) return null

  const fontSize = calculateNodeLabelFontSize(nodeSize, zoomLevel, fontSizeSetting)
  const labelText = node.data?.label || node.id
  const truncated =
    labelText.length > GRAPH_CONSTANTS.MAX_LABEL_LENGTH
      ? labelText.substring(0, GRAPH_CONSTANTS.MAX_LABEL_LENGTH) + '...'
      : labelText

  // Estimate text dimensions (same as label-renderer.ts)
  const textLength = truncated.length
  const estimatedCharWidth = fontSize * 0.6
  const textWidth = textLength * estimatedCharWidth
  const textHeight = fontSize

  const bgWidth = textWidth + GRAPH_CONSTANTS.NODE_LABEL_PADDING_X * 2
  const bgHeight = textHeight + GRAPH_CONSTANTS.NODE_LABEL_PADDING_Y * 2

  // Label position (below the node)
  const labelY = node.y + nodeSize + fontSize * 0.6

  // Calculate priority based on multiple factors
  const priority = calculateNodePriority(
    node,
    node.x,
    node.y,
    viewportWidth,
    viewportHeight,
    cameraX,
    cameraY
  )

  return {
    nodeId: node.id,
    x: node.x,
    y: labelY,
    width: bgWidth,
    height: bgHeight,
    priority,
  }
}

/**
 * Calculate node priority for label selection
 * Combines multiple factors:
 * - Connection count (importance)
 * - Distance from viewport center (spatial relevance)
 * - Node degree centrality
 *
 * @returns Priority score (higher = more important)
 */
function calculateNodePriority(
  node: SimulationNode,
  nodeX: number,
  nodeY: number,
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number,
  cameraY: number
): number {
  // Factor 1: Connection count (normalized 0-1)
  const connectionScore = Math.min(node.neighbors.length / 20, 1)

  // Factor 2: Distance from viewport center (0-1, closer = higher)
  const viewportCenterX = cameraX + viewportWidth / 2
  const viewportCenterY = cameraY + viewportHeight / 2
  const dx = nodeX - viewportCenterX
  const dy = nodeY - viewportCenterY
  const distanceFromCenter = Math.sqrt(dx * dx + dy * dy)
  const maxDistance = Math.sqrt(
    (viewportWidth / 2) ** 2 + (viewportHeight / 2) ** 2
  )
  const centerScore = Math.max(0, 1 - distanceFromCenter / maxDistance)

  // Weighted combination (connections more important than position)
  return connectionScore * 0.7 + centerScore * 0.3
}

/**
 * Check if two bounding boxes overlap
 *
 * @param a - First bounding box
 * @param b - Second bounding box
 * @returns True if boxes overlap
 */
export function boundingBoxesOverlap(
  a: LabelBoundingBox,
  b: LabelBoundingBox
): boolean {
  // Add small margin to prevent labels from being too close
  const margin = 4

  const aLeft = a.x - a.width / 2 - margin
  const aRight = a.x + a.width / 2 + margin
  const aTop = a.y - margin
  const aBottom = a.y + a.height + margin

  const bLeft = b.x - b.width / 2 - margin
  const bRight = b.x + b.width / 2 + margin
  const bTop = b.y - margin
  const bBottom = b.y + b.height + margin

  // Check for overlap
  return !(aRight < bLeft || aLeft > bRight || aBottom < bTop || aTop > bBottom)
}

/**
 * Greedy label selection algorithm with collision detection
 * Selects labels in priority order, skipping those that collide
 *
 * @param nodes - All simulation nodes
 * @param nodeSize - Base node size
 * @param zoomLevel - Current zoom level
 * @param fontSizeSetting - Font size setting percentage
 * @param viewportWidth - Viewport width
 * @param viewportHeight - Viewport height
 * @param cameraX - Camera X position
 * @param cameraY - Camera Y position
 * @param selectedNodeIds - Set of selected node IDs (always show)
 * @param highlightedNodeIds - Set of highlighted node IDs (always show)
 * @returns Set of node IDs whose labels should be visible
 */
export function selectLabelsWithDecluttering(
  nodes: SimulationNode[],
  nodeSize: number,
  zoomLevel: number,
  fontSizeSetting: number,
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number,
  cameraY: number,
  selectedNodeIds: Set<string>,
  highlightedNodeIds: Set<string>
): Set<string> {
  const visibleSet = new Set<string>()

  // Step 1: Calculate bounding boxes for all nodes
  const boundingBoxes: LabelBoundingBox[] = []
  for (const node of nodes) {
    const bbox = calculateLabelBoundingBox(
      node,
      nodeSize,
      zoomLevel,
      fontSizeSetting,
      viewportWidth,
      viewportHeight,
      cameraX,
      cameraY
    )
    if (bbox) {
      boundingBoxes.push(bbox)
    }
  }

  // Step 2: Sort by priority (highest first)
  boundingBoxes.sort((a, b) => b.priority - a.priority)

  // Step 3: Always include selected and highlighted nodes first
  const selectedBboxes: LabelBoundingBox[] = []
  const highlightedBboxes: LabelBoundingBox[] = []
  const regularBboxes: LabelBoundingBox[] = []

  for (const bbox of boundingBoxes) {
    if (selectedNodeIds.has(bbox.nodeId)) {
      selectedBboxes.push(bbox)
      visibleSet.add(bbox.nodeId)
    } else if (highlightedNodeIds.has(bbox.nodeId)) {
      highlightedBboxes.push(bbox)
      visibleSet.add(bbox.nodeId)
    } else {
      regularBboxes.push(bbox)
    }
  }

  // Step 4: Greedy selection - add labels that don't collide
  const placedBboxes = [...selectedBboxes, ...highlightedBboxes]

  for (const candidate of regularBboxes) {
    // Check if this label collides with any already placed label
    let hasCollision = false
    for (const placed of placedBboxes) {
      if (boundingBoxesOverlap(candidate, placed)) {
        hasCollision = true
        break
      }
    }

    if (!hasCollision) {
      placedBboxes.push(candidate)
      visibleSet.add(candidate.nodeId)
    }
  }

  return visibleSet
}

/**
 * Fast label selection with spatial hashing for large graphs
 * Uses a simplified collision detection for better performance
 *
 * @param nodes - All simulation nodes
 * @param nodeSize - Base node size
 * @param zoomLevel - Current zoom level
 * @param fontSizeSetting - Font size setting percentage
 * @param viewportWidth - Viewport width
 * @param viewportHeight - Viewport height
 * @param cameraX - Camera X position
 * @param cameraY - Camera Y position
 * @param selectedNodeIds - Set of selected node IDs (always show)
 * @param highlightedNodeIds - Set of highlighted node IDs (always show)
 * @param maxLabels - Maximum number of labels to show (performance limit)
 * @returns Set of node IDs whose labels should be visible
 */
export function selectLabelsWithDeclutteringFast(
  nodes: SimulationNode[],
  nodeSize: number,
  zoomLevel: number,
  fontSizeSetting: number,
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number,
  cameraY: number,
  selectedNodeIds: Set<string>,
  highlightedNodeIds: Set<string>,
  maxLabels: number = 200
): Set<string> {
  // For small graphs, use the accurate algorithm
  if (nodes.length < 500) {
    return selectLabelsWithDecluttering(
      nodes,
      nodeSize,
      zoomLevel,
      fontSizeSetting,
      viewportWidth,
      viewportHeight,
      cameraX,
      cameraY,
      selectedNodeIds,
      highlightedNodeIds
    )
  }

  // For large graphs, use spatial grid for faster collision detection
  const visibleSet = new Set<string>()
  const gridSize = 100 // Grid cell size in pixels
  const occupiedCells = new Set<string>()

  const getCellKey = (x: number, y: number): string => {
    const cellX = Math.floor(x / gridSize)
    const cellY = Math.floor(y / gridSize)
    return `${cellX},${cellY}`
  }

  // Calculate bounding boxes
  const boundingBoxes: LabelBoundingBox[] = []
  for (const node of nodes) {
    const bbox = calculateLabelBoundingBox(
      node,
      nodeSize,
      zoomLevel,
      fontSizeSetting,
      viewportWidth,
      viewportHeight,
      cameraX,
      cameraY
    )
    if (bbox) {
      boundingBoxes.push(bbox)
    }
  }

  // Sort by priority
  boundingBoxes.sort((a, b) => b.priority - a.priority)

  // Always add selected and highlighted first
  for (const bbox of boundingBoxes) {
    if (selectedNodeIds.has(bbox.nodeId) || highlightedNodeIds.has(bbox.nodeId)) {
      visibleSet.add(bbox.nodeId)
      const cellKey = getCellKey(bbox.x, bbox.y)
      occupiedCells.add(cellKey)

      // Also mark adjacent cells as occupied
      const cellX = Math.floor(bbox.x / gridSize)
      const cellY = Math.floor(bbox.y / gridSize)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          occupiedCells.add(`${cellX + dx},${cellY + dy}`)
        }
      }

      if (visibleSet.size >= maxLabels) break
    }
  }

  // Add regular labels
  for (const bbox of boundingBoxes) {
    if (visibleSet.size >= maxLabels) break
    if (selectedNodeIds.has(bbox.nodeId) || highlightedNodeIds.has(bbox.nodeId)) {
      continue // Already added
    }

    const cellKey = getCellKey(bbox.x, bbox.y)
    if (!occupiedCells.has(cellKey)) {
      visibleSet.add(bbox.nodeId)
      occupiedCells.add(cellKey)

      // Mark adjacent cells as occupied
      const cellX = Math.floor(bbox.x / gridSize)
      const cellY = Math.floor(bbox.y / gridSize)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          occupiedCells.add(`${cellX + dx},${cellY + dy}`)
        }
      }
    }
  }

  return visibleSet
}

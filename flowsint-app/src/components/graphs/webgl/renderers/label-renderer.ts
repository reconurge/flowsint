import { Text, Graphics } from 'pixi.js'
import { GRAPH_CONSTANTS } from '../constants'
import { calculateNodeLabelFontSize } from '../utils/visibility-calculator'
import type {
  SimulationNode,
  SimulationLink,
  EdgeLabelObjects,
  NodeLabelObjects,
} from '../types/graph.types'

/**
 * Update node label visibility and position
 * PERFORMANCE OPTIMIZED: Minimal recalculation, cached dimensions
 *
 * @param labelObjects - Node label objects (text and background)
 * @param node - Associated node
 * @param nodeSize - Size of the node
 * @param shouldShow - Whether the label (and background) should be visible
 * @param zoomLevel - Current zoom level
 * @param fontSizeSetting - Font size setting (percentage)
 * @param isHighlighted - Whether the node is highlighted
 * @param hasAnyHighlight - Whether any node is highlighted
 */
export function updateNodeLabel(
  labelObjects: NodeLabelObjects,
  node: SimulationNode,
  nodeSize: number,
  shouldShow: boolean,
  zoomLevel: number,
  fontSizeSetting: number,
  isHighlighted: boolean,
  hasAnyHighlight: boolean
): void {
  const { text: label, background } = labelObjects

  if (!node.x || !node.y) {
    label.visible = false
    background.visible = false
    return
  }

  if (!shouldShow) {
    label.visible = false
    background.visible = false
    return
  }

  // Calculate font size
  const fontSize = calculateNodeLabelFontSize(
    nodeSize,
    zoomLevel,
    fontSizeSetting
  )

  // Update label style
  label.style.fontSize = fontSize
  label.visible = true

  const labelY = node.y + nodeSize + fontSize * 0.6
  label.position.set(node.x, labelY)

  // Update alpha based on highlight state
  const alpha =
    hasAnyHighlight && !isHighlighted
      ? GRAPH_CONSTANTS.DIMMED_ALPHA
      : GRAPH_CONSTANTS.HIGHLIGHTED_ALPHA

  label.alpha = alpha

  // PERFORMANCE: Redraw background only when fontSize changes
  // @ts-ignore - cache last fontSize
  const lastFontSize = background._lastFontSize || 0
  const fontSizeChanged = Math.abs(fontSize - lastFontSize) > 0.5

  if (fontSizeChanged) {
    // Estimate text dimensions
    const textLength = label.text.length
    const estimatedCharWidth = fontSize * 0.6
    const textWidth = textLength * estimatedCharWidth
    const textHeight = fontSize

    const bgWidth = textWidth + GRAPH_CONSTANTS.NODE_LABEL_PADDING_X * 2
    const bgHeight = textHeight + GRAPH_CONSTANTS.NODE_LABEL_PADDING_Y * 2

    const bgX = -bgWidth / 2
    const bgY = -GRAPH_CONSTANTS.NODE_LABEL_PADDING_Y

    // Redraw background with new size
    background.clear()
    background.roundRect(
      bgX,
      bgY,
      bgWidth,
      bgHeight,
      GRAPH_CONSTANTS.NODE_LABEL_BORDER_RADIUS
    )
    background.fill({
      color: GRAPH_CONSTANTS.LABEL_BG_COLOR,
      alpha: GRAPH_CONSTANTS.NODE_LABEL_BG_ALPHA,
    })
    background.stroke({
      width: GRAPH_CONSTANTS.NODE_LABEL_BORDER_WIDTH,
      color: GRAPH_CONSTANTS.LABEL_BG_BORDER_COLOR,
      alpha: GRAPH_CONSTANTS.NODE_LABEL_BG_BORDER_ALPHA,
    })

    // @ts-ignore - cache fontSize
    background._lastFontSize = fontSize
  }

  // Update position and alpha
  background.position.set(node.x, labelY)
  background.alpha = alpha
  background.visible = true
}

/**
 * Create a node label with background
 * PERFORMANCE: Background is pre-rendered once with estimated max size
 *
 * @param labelText - Text to display
 * @returns Node label objects (text and background)
 */
export function createNodeLabel(labelText: string): NodeLabelObjects {
  const truncated =
    labelText.length > GRAPH_CONSTANTS.MAX_LABEL_LENGTH
      ? labelText.substring(0, GRAPH_CONSTANTS.MAX_LABEL_LENGTH) + '...'
      : labelText

  const text = new Text({
    text: truncated,
    style: {
      fontSize: 12,
      fill: GRAPH_CONSTANTS.LABEL_COLOR,
      fontFamily: 'sans-serif',
      fontWeight: '500',
    },
    anchor: { x: 0.5, y: 0 },
    resolution: 2,
  })

  // Pre-create background with estimated dimensions
  // We use the text length to estimate size (avoids expensive getBounds)
  const estimatedCharWidth = 12 * 0.6 // fontSize * 0.6
  const estimatedWidth = truncated.length * estimatedCharWidth
  const estimatedHeight = 12 // fontSize

  const bgWidth = estimatedWidth + GRAPH_CONSTANTS.NODE_LABEL_PADDING_X * 2
  const bgHeight = estimatedHeight + GRAPH_CONSTANTS.NODE_LABEL_PADDING_Y * 2

  const bgX = -bgWidth / 2
  const bgY = -GRAPH_CONSTANTS.NODE_LABEL_PADDING_Y

  const background = new Graphics()

  // Draw background ONCE, never clear and redraw
  background.roundRect(
    bgX,
    bgY,
    bgWidth,
    bgHeight,
    GRAPH_CONSTANTS.NODE_LABEL_BORDER_RADIUS
  )
  background.fill({
    color: GRAPH_CONSTANTS.LABEL_BG_COLOR,
    alpha: GRAPH_CONSTANTS.NODE_LABEL_BG_ALPHA,
  })
  background.stroke({
    width: GRAPH_CONSTANTS.NODE_LABEL_BORDER_WIDTH,
    color: GRAPH_CONSTANTS.LABEL_BG_BORDER_COLOR,
    alpha: GRAPH_CONSTANTS.NODE_LABEL_BG_BORDER_ALPHA,
  })

  return { text, background }
}

/**
 * Update edge label position and visibility
 *
 * @param edgeLabel - Edge label objects (text and background)
 * @param link - Associated link
 * @param zoomLevel - Current zoom level
 * @param isHighlighted - Whether the edge is highlighted
 * @param hasAnyHighlight - Whether any edge is highlighted
 */
export function updateEdgeLabel(
  edgeLabel: EdgeLabelObjects,
  link: SimulationLink,
  zoomLevel: number,
  isHighlighted: boolean,
  hasAnyHighlight: boolean
): void {
  const source = link.source as SimulationNode
  const target = link.target as SimulationNode

  if (!source.x || !source.y || !target.x || !target.y) {
    edgeLabel.text.visible = false
    edgeLabel.background.visible = false
    return
  }

  // Calculate midpoint
  const midX = (source.x + target.x) / 2
  const midY = (source.y + target.y) / 2

  // Calculate rotation angle
  const dx = target.x - source.x
  const dy = target.y - source.y
  let angle = Math.atan2(dy, dx)

  // Keep text readable (flip if upside down)
  if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
    angle += angle > 0 ? -Math.PI : Math.PI
  }

  // Scale to compensate for zoom
  const scale = 1 / zoomLevel

  // Update text
  edgeLabel.text.position.set(midX, midY)
  edgeLabel.text.rotation = angle
  edgeLabel.text.scale.set(scale, scale)

  // Update background
  const padding = GRAPH_CONSTANTS.EDGE_LABEL_PADDING
  const textMetrics = 10 // Fixed font size
  const estimatedTextWidth = edgeLabel.text.text.length * textMetrics * 0.5
  const bgWidth = estimatedTextWidth + padding * 2
  const bgHeight = textMetrics + padding

  edgeLabel.background.clear()
  edgeLabel.background.position.set(midX, midY)
  edgeLabel.background.rotation = angle
  edgeLabel.background.scale.set(scale, scale)

  edgeLabel.background.roundRect(
    -bgWidth / 2,
    -bgHeight / 2,
    bgWidth,
    bgHeight,
    GRAPH_CONSTANTS.EDGE_LABEL_BORDER_RADIUS
  )
  edgeLabel.background.fill({
    color: GRAPH_CONSTANTS.EDGE_LABEL_BG_COLOR,
    alpha: GRAPH_CONSTANTS.EDGE_LABEL_BG_ALPHA,
  })

  // Update alpha based on highlight state
  const alpha =
    hasAnyHighlight && !isHighlighted
      ? GRAPH_CONSTANTS.DIMMED_ALPHA
      : GRAPH_CONSTANTS.HIGHLIGHTED_ALPHA

  edgeLabel.text.alpha = alpha
  edgeLabel.background.alpha = alpha * GRAPH_CONSTANTS.EDGE_LABEL_BG_ALPHA

  edgeLabel.text.visible = true
  edgeLabel.background.visible = true
}

/**
 * Create edge label objects (text and background)
 *
 * @param labelText - Text to display
 * @returns Edge label objects
 */
export function createEdgeLabel(labelText: string): EdgeLabelObjects {
  const background = new Graphics()
  const text = new Text({
    text: labelText,
    style: {
      fontSize: 10,
      fill: GRAPH_CONSTANTS.LABEL_COLOR,
      fontFamily: 'sans-serif',
      fontWeight: '400',
    },
    anchor: { x: 0.5, y: 0.5 },
    resolution: 2,
  })

  return { text, background }
}

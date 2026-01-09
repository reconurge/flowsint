import { CONSTANTS, GRAPH_COLORS, tempPos, tempDimensions } from '../utils/constants'
import { calculateNodeSize } from '../utils/utils'

interface LinkRenderParams {
  link: any
  ctx: CanvasRenderingContext2D
  globalScale: number
  forceSettings: any
  theme: string
  highlightLinks: Set<string>
  highlightNodes: Set<string>
  selectedEdges: any[]
  currentEdge: any
  autoColorLinksByNodeType?: boolean
}

// Helper to check if a node position is in viewport
const isPositionInViewport = (
  x: number,
  y: number,
  ctx: CanvasRenderingContext2D,
  margin: number = 80
): boolean => {
  const transform = ctx.getTransform()
  const canvasWidth = ctx.canvas.width
  const canvasHeight = ctx.canvas.height

  // Transform position to screen coordinates
  const screenX = x * transform.a + transform.e
  const screenY = y * transform.d + transform.f

  // Check if within viewport bounds (with margin for smoother culling)
  return (
    screenX >= -margin &&
    screenX <= canvasWidth + margin &&
    screenY >= -margin &&
    screenY <= canvasHeight + margin
  )
}

// Helper to check if edge is in viewport (at least one endpoint or edge crosses viewport)
const isEdgeInViewport = (
  link: any,
  ctx: CanvasRenderingContext2D,
  margin: number = 80
): boolean => {
  const { source: start, target: end } = link
  if (typeof start !== 'object' || typeof end !== 'object') return false

  // Check if either endpoint is in viewport
  const startInView = isPositionInViewport(start.x, start.y, ctx, margin)
  const endInView = isPositionInViewport(end.x, end.y, ctx, margin)

  if (startInView || endInView) return true

  // Check if edge crosses viewport (both endpoints outside but line passes through)
  const transform = ctx.getTransform()
  const canvasWidth = ctx.canvas.width
  const canvasHeight = ctx.canvas.height

  const screenStartX = start.x * transform.a + transform.e
  const screenStartY = start.y * transform.d + transform.f
  const screenEndX = end.x * transform.a + transform.e
  const screenEndY = end.y * transform.d + transform.f

  // Simple AABB intersection check
  const minX = Math.min(screenStartX, screenEndX)
  const maxX = Math.max(screenStartX, screenEndX)
  const minY = Math.min(screenStartY, screenEndY)
  const maxY = Math.max(screenStartY, screenEndY)

  return !(
    maxX < -margin ||
    minX > canvasWidth + margin ||
    maxY < -margin ||
    minY > canvasHeight + margin
  )
}

export const renderLink = ({
  link,
  ctx,
  globalScale,
  forceSettings,
  theme,
  highlightLinks,
  highlightNodes,
  selectedEdges,
  currentEdge,
  autoColorLinksByNodeType
}: LinkRenderParams) => {
  if (globalScale < CONSTANTS.ZOOM_EDGE_DETAIL_THRESHOLD) return

  const { source: start, target: end } = link
  if (typeof start !== 'object' || typeof end !== 'object') return

  // Early exit: skip edge if outside viewport
  if (!isEdgeInViewport(link, ctx)) return

  const linkKey = `${start.id}-${end.id}`
  const isHighlighted = highlightLinks.has(linkKey)
  const isSelected = selectedEdges.some((e) => e.id === link.id)
  const isCurrent = currentEdge?.id === link.id
  const hasAnyHighlight = highlightNodes.size > 0 || highlightLinks.size > 0
  let linkWidthBase = forceSettings?.linkWidth?.value ?? 2
  const shouldRenderDetails = globalScale > CONSTANTS.ZOOM_NODE_DETAIL_THRESHOLD

  const linkWidth = shouldRenderDetails
    ? linkWidthBase
    : linkWidthBase * CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER

  const targetNodeColor = autoColorLinksByNodeType
    ? end.nodeColor || GRAPH_COLORS.LINK_DEFAULT
    : GRAPH_COLORS.LINK_DEFAULT

  let strokeStyle: string
  let lineWidth: number
  let fillStyle: string

  if (isCurrent) {
    strokeStyle = 'rgba(59, 130, 246, 0.95)'
    fillStyle = 'rgba(59, 130, 246, 0.95)'
    lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 2.3)
  } else if (isSelected) {
    strokeStyle = autoColorLinksByNodeType ? targetNodeColor : GRAPH_COLORS.LINK_HIGHLIGHTED
    fillStyle = autoColorLinksByNodeType ? targetNodeColor : GRAPH_COLORS.LINK_HIGHLIGHTED
    lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 2.5)
  } else if (isHighlighted) {
    strokeStyle = GRAPH_COLORS.LINK_HIGHLIGHTED
    fillStyle = GRAPH_COLORS.LINK_HIGHLIGHTED
    lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 3)
  } else if (hasAnyHighlight) {
    strokeStyle = GRAPH_COLORS.LINK_DIMMED
    fillStyle = GRAPH_COLORS.LINK_DIMMED
    lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 5)
  } else {
    strokeStyle = autoColorLinksByNodeType ? targetNodeColor : GRAPH_COLORS.LINK_DEFAULT
    fillStyle = autoColorLinksByNodeType ? targetNodeColor : GRAPH_COLORS.LINK_DEFAULT
    lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 5)
  }

  // Calculate node radii to stop links at node edges
  // Uses the shared calculateNodeSize function to ensure consistency with node-renderer
  const startRadius = calculateNodeSize(
    start,
    forceSettings,
    shouldRenderDetails,
    CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER
  )
  const endRadius = calculateNodeSize(
    end,
    forceSettings,
    shouldRenderDetails,
    CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER
  )

  const arrowLengthSetting = forceSettings?.linkDirectionalArrowLength?.value
  const arrowLength = shouldRenderDetails
    ? arrowLengthSetting
    : arrowLengthSetting * CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER

  // Draw connection line
  const curvature: number = link.curvature || 0
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = Math.sqrt(dx * dx + dy * dy) || 1

  // Shorten the line to stop at node edges
  const startRatio = startRadius / distance
  const endRatio = (endRadius + arrowLength) / distance
  const adjustedStartX = start.x + dx * startRatio
  const adjustedStartY = start.y + dy * startRatio
  const adjustedEndX = end.x - dx * endRatio
  const adjustedEndY = end.y - dy * endRatio

  const midX = (adjustedStartX + adjustedEndX) * 0.5
  const midY = (adjustedStartY + adjustedEndY) * 0.5
  const normX = -dy / distance
  const normY = dx / distance
  const offset = curvature * distance
  const ctrlX = midX + normX * offset
  const ctrlY = midY + normY * offset

  ctx.beginPath()
  ctx.moveTo(adjustedStartX, adjustedStartY)
  if (curvature !== 0) {
    ctx.quadraticCurveTo(ctrlX, ctrlY, adjustedEndX, adjustedEndY)
  } else {
    ctx.lineTo(adjustedEndX, adjustedEndY)
  }
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  ctx.stroke()

  // Draw directional arrow
  if (arrowLength && arrowLength > 0) {
    const arrowRelPos = forceSettings?.linkDirectionalArrowRelPos?.value || 1

    const bezierPoint = (t: number) => {
      if (curvature === 0) {
        return { x: start.x + dx * t, y: start.y + dy * t }
      }
      const oneMinusT = 1 - t
      return {
        x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * ctrlX + t * t * end.x,
        y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * ctrlY + t * t * end.y
      }
    }

    const bezierTangent = (t: number) => {
      if (curvature === 0) {
        return { x: dx, y: dy }
      }
      const oneMinusT = 1 - t
      return {
        x: 2 * oneMinusT * (ctrlX - start.x) + 2 * t * (end.x - ctrlX),
        y: 2 * oneMinusT * (ctrlY - start.y) + 2 * t * (end.y - ctrlY)
      }
    }

    const t = arrowRelPos
    let { x: arrowX, y: arrowY } = bezierPoint(t)

    if (arrowRelPos === 1) {
      const tan = bezierTangent(0.99)
      const tanLen = Math.hypot(tan.x, tan.y) || 1
      // Use the same calculation as above to ensure consistency
      const targetNodeSize = calculateNodeSize(
        end,
        forceSettings,
        shouldRenderDetails,
        CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER
      )
      arrowX = end.x - (tan.x / tanLen) * targetNodeSize
      arrowY = end.y - (tan.y / tanLen) * targetNodeSize
    }

    const tan = bezierTangent(t)
    const angle = Math.atan2(tan.y, tan.x)

    ctx.save()
    ctx.translate(arrowX, arrowY)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-arrowLength, -arrowLength * 0.5)
    ctx.lineTo(-arrowLength, arrowLength * 0.5)
    ctx.closePath()
    ctx.fillStyle = fillStyle
    ctx.fill()
    ctx.restore()
  }

  if (!link.label) return

  // Draw label for highlighted links
  if (isHighlighted && globalScale > CONSTANTS.ZOOM_EDGE_DETAIL_THRESHOLD) {
    let textAngle: number
    if ((link.curvature || 0) !== 0) {
      const t = 0.5
      const oneMinusT = 1 - t
      tempPos.x = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * ctrlX + t * t * end.x
      tempPos.y = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * ctrlY + t * t * end.y
      const tx = 2 * oneMinusT * (ctrlX - start.x) + 2 * t * (end.x - ctrlX)
      const ty = 2 * oneMinusT * (ctrlY - start.y) + 2 * t * (end.y - ctrlY)
      textAngle = Math.atan2(ty, tx)
    } else {
      tempPos.x = (start.x + end.x) * 0.5
      tempPos.y = (start.y + end.y) * 0.5
      const sdx = end.x - start.x
      const sdy = end.y - start.y
      textAngle = Math.atan2(sdy, sdx)
    }

    if (textAngle > CONSTANTS.HALF_PI || textAngle < -CONSTANTS.HALF_PI) {
      textAngle += textAngle > 0 ? -CONSTANTS.PI : CONSTANTS.PI
    }

    const linkLabelSetting = forceSettings?.linkLabelFontSize?.value ?? 50
    const linkFontSize = CONSTANTS.LABEL_FONT_SIZE * (linkLabelSetting / 100)
    ctx.font = `${linkFontSize}px Sans-Serif`
    const textWidth = ctx.measureText(link.label).width
    const padding = linkFontSize * CONSTANTS.PADDING_RATIO
    tempDimensions[0] = textWidth + padding
    tempDimensions[1] = linkFontSize + padding
    const halfWidth = tempDimensions[0] * 0.5
    const halfHeight = tempDimensions[1] * 0.5

    ctx.save()
    ctx.translate(tempPos.x, tempPos.y)
    ctx.rotate(textAngle)

    const borderRadius = linkFontSize * 0.1
    ctx.beginPath()
    ctx.roundRect(-halfWidth, -halfHeight, tempDimensions[0], tempDimensions[1], borderRadius)

    if (theme === 'light') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    } else {
      ctx.fillStyle = 'rgba(32, 32, 32, 0.95)'
    }
    ctx.fill()

    ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 0.1
    ctx.stroke()

    ctx.fillStyle = isHighlighted
      ? GRAPH_COLORS.LINK_LABEL_HIGHLIGHTED
      : GRAPH_COLORS.LINK_LABEL_DEFAULT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic' // More consistent across browsers than 'middle'

    // Calculate vertical center manually using font metrics
    const labelMetrics = ctx.measureText(link.label)
    const labelTextY =
      labelMetrics.actualBoundingBoxAscent * 0.5 - labelMetrics.actualBoundingBoxDescent * 0.5

    ctx.fillText(link.label, 0, labelTextY)
    ctx.restore()
  }
}

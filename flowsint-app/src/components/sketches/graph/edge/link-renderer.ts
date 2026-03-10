import { CONSTANTS, GRAPH_COLORS, tempPos, tempDimensions } from '../utils/constants'
import { getNodeEdgeDistance } from '../node/node-renderer'
import { RenderContext, isEdgeInViewport } from '../utils/render-context'

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
  rc: RenderContext
}

// Module-level bezier tangent to avoid closure allocation per link
const bezierTangentAt1 = (
  startX: number,
  startY: number,
  ctrlX: number,
  ctrlY: number,
  endX: number,
  endY: number,
  isCurved: boolean
) => {
  if (!isCurved) {
    return { x: endX - startX, y: endY - startY }
  }
  return {
    x: 2 * (endX - ctrlX),
    y: 2 * (endY - ctrlY)
  }
}

export const renderLink = ({
  link,
  ctx,
  globalScale,
  forceSettings,
  highlightLinks,
  currentEdge,
  autoColorLinksByNodeType,
  rc
}: LinkRenderParams) => {
  if (globalScale < CONSTANTS.ZOOM_EDGE_DETAIL_THRESHOLD) return

  const { source: start, target: end } = link
  if (typeof start !== 'object' || typeof end !== 'object') return

  // Viewport culling using pre-computed transform (no DOMMatrix allocation)
  if (!isEdgeInViewport(start.x, start.y, end.x, end.y, ctx)) return

  const linkKey = `${start.id}-${end.id}`
  const isHighlighted = highlightLinks.has(linkKey)
  const isSelected = rc.selectedEdgeIds.has(link.id)
  const isCurrent = currentEdge?.id === link.id
  let linkWidthBase = forceSettings?.linkWidth?.value ?? 2

  const linkWidth = rc.shouldRenderDetails
    ? linkWidthBase
    : linkWidthBase * CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER

  const targetNodeColor = autoColorLinksByNodeType
    ? end.nodeColor || GRAPH_COLORS.LINK_DEFAULT
    : GRAPH_COLORS.LINK_DEFAULT

  let strokeStyle: string
  let fillStyle: string
  let lineWidth: number

  if (isCurrent) {
    strokeStyle = 'rgba(59, 130, 246, 0.95)'
    fillStyle = strokeStyle
    lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 2.3)
  } else if (isSelected) {
    strokeStyle = autoColorLinksByNodeType ? targetNodeColor : GRAPH_COLORS.LINK_HIGHLIGHTED
    fillStyle = strokeStyle
    lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 2.5)
  } else if (isHighlighted) {
    strokeStyle = GRAPH_COLORS.LINK_HIGHLIGHTED
    fillStyle = strokeStyle
    lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 3)
  } else if (rc.hasAnyHighlight) {
    strokeStyle = GRAPH_COLORS.LINK_DIMMED
    fillStyle = strokeStyle
    lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 5)
  } else {
    strokeStyle = autoColorLinksByNodeType ? targetNodeColor : GRAPH_COLORS.LINK_DEFAULT
    fillStyle = strokeStyle
    lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 5)
  }

  const arrowLengthSetting = forceSettings?.linkDirectionalArrowLength?.value
  const arrowLength = rc.shouldRenderDetails
    ? arrowLengthSetting
    : arrowLengthSetting * CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER

  // Geometry
  const curvature: number = link.curvature || 0
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = Math.sqrt(dx * dx + dy * dy) || 1

  const origMidX = (start.x + end.x) * 0.5
  const origMidY = (start.y + end.y) * 0.5
  const normX = -dy / distance
  const normY = dx / distance
  const offset = curvature * distance
  const ctrlX = origMidX + normX * offset
  const ctrlY = origMidY + normY * offset

  const isCurved = curvature !== 0

  const startTanX = isCurved ? ctrlX - start.x : dx
  const startTanY = isCurved ? ctrlY - start.y : dy
  const startTanLen = Math.hypot(startTanX, startTanY) || 1

  const endTanX = isCurved ? end.x - ctrlX : dx
  const endTanY = isCurved ? end.y - ctrlY : dy
  const endTanLen = Math.hypot(endTanX, endTanY) || 1

  const startAngle = Math.atan2(startTanY, startTanX)
  const endAngle = Math.atan2(endTanY, endTanX)
  const startEdgeDist = getNodeEdgeDistance(
    start,
    startAngle,
    forceSettings,
    ctx,
    rc.shouldRenderDetails
  )
  const endEdgeDist = getNodeEdgeDistance(
    end,
    endAngle + Math.PI,
    forceSettings,
    ctx,
    rc.shouldRenderDetails
  )

  const adjustedStartX = start.x + (startTanX / startTanLen) * startEdgeDist
  const adjustedStartY = start.y + (startTanY / startTanLen) * startEdgeDist
  const adjustedEndX = end.x - (endTanX / endTanLen) * (endEdgeDist + arrowLength)
  const adjustedEndY = end.y - (endTanY / endTanLen) * (endEdgeDist + arrowLength)

  // Draw line
  ctx.beginPath()
  ctx.moveTo(adjustedStartX, adjustedStartY)
  if (isCurved) {
    ctx.quadraticCurveTo(ctrlX, ctrlY, adjustedEndX, adjustedEndY)
  } else {
    ctx.lineTo(adjustedEndX, adjustedEndY)
  }
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  ctx.stroke()

  // Arrow
  if (arrowLength && arrowLength > 0) {
    const endTan = bezierTangentAt1(
      adjustedStartX, adjustedStartY,
      ctrlX, ctrlY,
      adjustedEndX, adjustedEndY,
      isCurved
    )
    const angle = Math.atan2(endTan.y, endTan.x)

    ctx.save()
    ctx.translate(adjustedEndX, adjustedEndY)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.moveTo(arrowLength, 0)
    ctx.lineTo(0, -arrowLength * 0.5)
    ctx.lineTo(0, arrowLength * 0.5)
    ctx.closePath()
    ctx.fillStyle = fillStyle
    ctx.fill()
    ctx.restore()
  }

  if (!link.label) return

  // Label (only for highlighted links when zoomed in)
  if (isHighlighted && globalScale > CONSTANTS.ZOOM_EDGE_DETAIL_THRESHOLD) {
    let textAngle: number
    if (isCurved) {
      const t = 0.5
      const oneMinusT = 0.5
      tempPos.x =
        oneMinusT * oneMinusT * adjustedStartX + 2 * oneMinusT * t * ctrlX + t * t * adjustedEndX
      tempPos.y =
        oneMinusT * oneMinusT * adjustedStartY + 2 * oneMinusT * t * ctrlY + t * t * adjustedEndY
      const tx = 2 * oneMinusT * (ctrlX - adjustedStartX) + 2 * t * (adjustedEndX - ctrlX)
      const ty = 2 * oneMinusT * (ctrlY - adjustedStartY) + 2 * t * (adjustedEndY - ctrlY)
      textAngle = Math.atan2(ty, tx)
    } else {
      tempPos.x = (adjustedStartX + adjustedEndX) * 0.5
      tempPos.y = (adjustedStartY + adjustedEndY) * 0.5
      const sdx = adjustedEndX - adjustedStartX
      const sdy = adjustedEndY - adjustedStartY
      textAngle = Math.atan2(sdy, sdx)
    }

    if (textAngle > CONSTANTS.HALF_PI || textAngle < -CONSTANTS.HALF_PI) {
      textAngle += textAngle > 0 ? -CONSTANTS.PI : CONSTANTS.PI
    }

    const linkLabelSetting = forceSettings?.linkLabelFontSize?.value ?? 50
    const linkFontSize = CONSTANTS.LABEL_FONT_SIZE * (linkLabelSetting / 100)
    ctx.font = `${linkFontSize}px Sans-Serif`

    // Single measureText call — reuse metrics for both width and vertical positioning
    const metrics = ctx.measureText(link.label)
    const textWidth = metrics.width
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

    ctx.fillStyle = rc.themeEdgeLabelBg
    ctx.fill()

    ctx.strokeStyle = rc.themeLabelBorder
    ctx.lineWidth = 0.1
    ctx.stroke()

    ctx.fillStyle = isHighlighted
      ? GRAPH_COLORS.LINK_LABEL_HIGHLIGHTED
      : GRAPH_COLORS.LINK_LABEL_DEFAULT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    const labelTextY =
      metrics.actualBoundingBoxAscent * 0.5 - metrics.actualBoundingBoxDescent * 0.5

    ctx.fillText(link.label, 0, labelTextY)
    ctx.restore()
  }
}

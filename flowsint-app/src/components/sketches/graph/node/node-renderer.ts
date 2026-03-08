import { GraphNode, NodeShape } from '@/types'
import { CONSTANTS, GRAPH_COLORS } from '../utils/constants'
import {
  getCachedImage,
  getCachedFlagImage,
  getCachedIconByName,
  getCachedExternalImage
} from '../utils/image-cache'
import { truncateText, calculateNodeSize } from '../utils/utils'
import { RenderContext, isInViewport, getDimmedColor } from '../utils/render-context'

type NodeVisual = {
  image: HTMLImageElement
  isExternal: boolean
} | null

const FLAG_COLORS: Record<string, { stroke: string; fill: string }> = {
  red: { stroke: '#f87171', fill: '#fecaca' },
  orange: { stroke: '#fb923c', fill: '#fed7aa' },
  blue: { stroke: '#60a5fa', fill: '#bfdbfe' },
  green: { stroke: '#4ade80', fill: '#bbf7d0' },
  yellow: { stroke: '#facc15', fill: '#fef08a' }
}

// --- Shape path helpers ---

const drawCirclePath = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.arc(x, y, size, 0, 2 * Math.PI)
}

const drawSquarePath = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.rect(x - size, y - size, size * 2, size * 2)
}

// Pre-computed hexagon angles (flat-top)
const HEX_COS = Array.from({ length: 6 }, (_, i) => Math.cos((Math.PI / 3) * i - Math.PI / 6))
const HEX_SIN = Array.from({ length: 6 }, (_, i) => Math.sin((Math.PI / 3) * i - Math.PI / 6))

const drawHexagonPath = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.moveTo(x + size * HEX_COS[0], y + size * HEX_SIN[0])
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(x + size * HEX_COS[i], y + size * HEX_SIN[i])
  }
  ctx.closePath()
}

const SQRT3 = Math.sqrt(3)

const drawTrianglePath = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const height = size * SQRT3
  const topY = y - height / 2
  const bottomY = y + height / 2
  ctx.moveTo(x, topY)
  ctx.lineTo(x + size, bottomY)
  ctx.lineTo(x - size, bottomY)
  ctx.closePath()
}

const drawNodePath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: NodeShape
) => {
  ctx.beginPath()
  switch (shape) {
    case 'square':
      drawSquarePath(ctx, x, y, size)
      break
    case 'hexagon':
      drawHexagonPath(ctx, x, y, size)
      break
    case 'triangle':
      drawTrianglePath(ctx, x, y, size)
      break
    case 'circle':
    default:
      drawCirclePath(ctx, x, y, size)
      break
  }
}

// --- Clipped image drawing ---

const drawClippedImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  shape: NodeShape
) => {
  const diameter = size * 2
  const imgAspect = img.naturalWidth / img.naturalHeight

  let drawWidth: number, drawHeight: number
  if (imgAspect > 1) {
    drawHeight = diameter
    drawWidth = diameter * imgAspect
  } else {
    drawWidth = diameter
    drawHeight = diameter / imgAspect
  }

  drawNodePath(ctx, x, y, size, shape)
  ctx.clip()
  ctx.drawImage(img, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight)
}

// --- Node visual resolution ---

const getNodeVisual = (node: GraphNode, iconColor: string): NodeVisual => {
  if (node.nodeImage) {
    const img = getCachedExternalImage(node.nodeImage)
    if (img?.complete) return { image: img, isExternal: true }
  }

  if (node.nodeIcon) {
    const img = getCachedIconByName(node.nodeIcon, iconColor)
    if (img?.complete) return { image: img, isExternal: false }
  }

  if (node.nodeType) {
    const img = getCachedImage(node.nodeType, iconColor)
    if (img?.complete) return { image: img, isExternal: false }
  }

  return null
}

// --- Flag drawing (single shared helper) ---

const drawFlag = (
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  size: number
) => {
  const flagColor = FLAG_COLORS[node.nodeFlag!]
  if (!flagColor) return

  const cachedFlag = getCachedFlagImage(flagColor.stroke, flagColor.fill)
  if (!cachedFlag?.complete) return

  const flagSize = size * 0.8
  const flagX = node.x + 0.8 + size * 0.5 - flagSize / 2
  const flagY = node.y - 1.4 - size * 0.5 - flagSize / 2

  const prevAlpha = ctx.globalAlpha
  ctx.globalAlpha = 1
  ctx.drawImage(cachedFlag, flagX, flagY, flagSize, flagSize)
  ctx.globalAlpha = prevAlpha
}

// --- Shared node shape drawing (fill + stroke in one path) ---

const drawNodeShape = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: NodeShape,
  nodeColor: string,
  isOutlined: boolean,
  rc: RenderContext
) => {
  drawNodePath(ctx, x, y, size, shape)

  if (isOutlined) {
    ctx.fillStyle = rc.themeBgFill
    ctx.fill()
    ctx.strokeStyle = nodeColor
    ctx.lineWidth = Math.max(2, size * 0.02) / rc.globalScale
    ctx.stroke()
  } else {
    ctx.fillStyle = nodeColor
    ctx.fill()
    // Stroke the same path — no need to rebuild it
    ctx.strokeStyle = rc.themeSubtleBorder
    ctx.lineWidth = 0.3
    ctx.stroke()
  }
}

// --- Icons/images rendering ---

const drawNodeIcon = (
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  x: number,
  y: number,
  size: number,
  shape: NodeShape,
  isOutlined: boolean,
  isHighlighted: boolean,
  hasAnyHighlight: boolean,
  theme: string
) => {
  const iconColor = isOutlined ? (theme === 'dark' ? '#FFFFFF' : '#000000') : '#FFFFFF'
  const visual = getNodeVisual(node, iconColor)
  if (!visual) return

  const iconAlpha = hasAnyHighlight && !isHighlighted ? 0.5 : 0.9
  const prevAlpha = ctx.globalAlpha
  ctx.globalAlpha = iconAlpha

  if (visual.isExternal) {
    const imgSize = size * 0.9
    drawClippedImage(ctx, visual.image, x, y, imgSize, shape)
  } else {
    const iconSize = size * 1.2
    ctx.drawImage(visual.image, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize)
  }

  ctx.globalAlpha = prevAlpha
}

// --- Label rendering ---

const drawNodeLabel = (
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  size: number,
  isHighlighted: boolean,
  forceSettings: any,
  rc: RenderContext
) => {
  const label = truncateText(node.nodeLabel || node.id, 58)
  if (!label) return

  const baseFontSize = Math.max(
    CONSTANTS.MIN_FONT_SIZE,
    (CONSTANTS.NODE_FONT_SIZE * (size / 2)) / rc.globalScale + 2
  )
  const nodeLabelSetting = forceSettings?.nodeLabelFontSize?.value ?? 50
  const fontSize = baseFontSize * (nodeLabelSetting / 100)
  ctx.font = `${fontSize}px Sans-Serif`

  const textWidth = ctx.measureText(label).width
  const paddingX = fontSize * 0.4
  const paddingY = fontSize * 0.25
  const bgWidth = textWidth + paddingX * 2
  const bgHeight = fontSize + paddingY * 2
  const borderRadius = fontSize * 0.3
  const bgY = node.y + size / 2 + fontSize * 0.6

  const bgX = node.x - bgWidth / 2
  ctx.beginPath()
  ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius)
  ctx.fillStyle = isHighlighted ? rc.themeLabelBgHighlighted : rc.themeLabelBg
  ctx.fill()

  ctx.strokeStyle = rc.themeLabelBorder
  ctx.lineWidth = 0.1
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = isHighlighted ? rc.themeTextColor : `${rc.themeTextColor}CC`

  const metrics = ctx.measureText(label)
  const textY = bgY + paddingY + metrics.actualBoundingBoxAscent
  ctx.fillText(label, node.x, textY)
}

// --- Mock label (zoomed out) ---

const drawMockLabel = (
  ctx: CanvasRenderingContext2D,
  nodeX: number,
  nodeY: number,
  size: number,
  rc: RenderContext
) => {
  const mockLabelWidth = 15
  const mockLabelHeight = 3
  const mockLabelY = nodeY + size + mockLabelHeight * 0.5
  const mockLabelX = nodeX - mockLabelWidth / 2
  const borderRadius = mockLabelHeight * 0.3

  ctx.beginPath()
  ctx.roundRect(mockLabelX, mockLabelY, mockLabelWidth, mockLabelHeight, borderRadius)
  ctx.fillStyle = rc.themeMockLabelFill
  ctx.fill()
}

// --- Params ---

export interface NodeRenderParams {
  node: GraphNode
  ctx: CanvasRenderingContext2D
  globalScale: number
  forceSettings: any
  showLabels: boolean
  showIcons: boolean
  isCurrent: (nodeId: string) => boolean
  isSelected: (nodeId: string) => boolean
  theme: string
  highlightNodes: Set<string>
  highlightLinks: Set<string>
  hoverNode: string | null
  rc: RenderContext
}

// --- Card layout constants ---

const CARD_BASE = {
  iconSize: 7,
  paddingX: 4,
  paddingY: 3,
  gap: 3,
  typeFontSize: 3.5,
  labelFontSize: 4.5,
  borderRadius: 3,
  accentWidth: 1.5
} as const

const getCardScale = (node: GraphNode, forceSettings: any) => {
  const size = calculateNodeSize(node, forceSettings, true, 1)
  return Math.max(0.5, size / 5)
}

const getCardDimensions = (node: GraphNode, ctx: CanvasRenderingContext2D, forceSettings: any) => {
  const s = getCardScale(node, forceSettings)
  const label = truncateText(node.nodeLabel || node.id, 40)
  const typeText = node.nodeType || ''

  const labelFontSize = CARD_BASE.labelFontSize * s
  const typeFontSize = CARD_BASE.typeFontSize * s
  const iconSize = CARD_BASE.iconSize * s
  const paddingX = CARD_BASE.paddingX * s
  const gap = CARD_BASE.gap * s
  const paddingY = CARD_BASE.paddingY * s

  ctx.font = `bold ${labelFontSize}px Sans-Serif`
  const labelWidth = ctx.measureText(label).width

  ctx.font = `${typeFontSize}px Sans-Serif`
  const typeWidth = ctx.measureText(typeText).width

  const textWidth = Math.max(labelWidth, typeWidth)
  const cardWidth = paddingX + iconSize + gap + textWidth + paddingX
  const cardHeight = paddingY + Math.max(iconSize, typeFontSize + 2 * s + labelFontSize) + paddingY

  return { cardWidth, cardHeight, label, typeText, scale: s }
}

// --- Card flag drawing ---

const drawCardFlag = (
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  cardX: number,
  cardY: number,
  cardWidth: number,
  s: number
) => {
  const flagColor = FLAG_COLORS[node.nodeFlag!]
  if (!flagColor) return

  const cachedFlag = getCachedFlagImage(flagColor.stroke, flagColor.fill)
  if (!cachedFlag?.complete) return

  const fSize = 6 * s
  const prevAlpha = ctx.globalAlpha
  ctx.globalAlpha = 1
  ctx.drawImage(
    cachedFlag,
    cardX + cardWidth - fSize * 0.6,
    cardY - fSize * 0.4,
    fSize,
    fSize
  )
  ctx.globalAlpha = prevAlpha
}

// --- Card-style node renderer ---

const renderCardNode = (params: NodeRenderParams) => {
  const {
    node,
    ctx,
    forceSettings,
    showIcons,
    isCurrent,
    isSelected,
    theme,
    highlightNodes,
    hoverNode,
    rc
  } = params
  const isHighlighted = highlightNodes.has(node.id) || isSelected(node.id) || isCurrent(node.id)
  const isHovered = hoverNode === node.id || isCurrent(node.id)

  const nodeColor = rc.hasAnyHighlight
    ? isHighlighted
      ? node.nodeColor
      : getDimmedColor(rc, node.nodeColor!)
    : node.nodeColor

  const isOutlined = forceSettings.nodeOutlined?.value ?? false
  const {
    cardWidth,
    cardHeight,
    label,
    typeText,
    scale: s
  } = getCardDimensions(node, ctx, forceSettings)

  const borderRadius = CARD_BASE.borderRadius * s
  const accentWidth = CARD_BASE.accentWidth * s
  const iconSize = CARD_BASE.iconSize * s
  const paddingX = CARD_BASE.paddingX * s
  const paddingY = CARD_BASE.paddingY * s
  const gap = CARD_BASE.gap * s
  const typeFontSize = CARD_BASE.typeFontSize * s
  const labelFontSize = CARD_BASE.labelFontSize * s

  const cardX = node.x - cardWidth / 2
  const cardY = node.y - cardHeight / 2

  // Highlight ring
  if (isHighlighted) {
    const border = 2 / rc.globalScale
    ctx.beginPath()
    ctx.roundRect(
      cardX - border,
      cardY - border,
      cardWidth + border * 2,
      cardHeight + border * 2,
      borderRadius + border
    )
    ctx.fillStyle = isHovered
      ? GRAPH_COLORS.NODE_HIGHLIGHT_HOVER
      : GRAPH_COLORS.NODE_HIGHLIGHT_DEFAULT
    ctx.fill()
  }

  // Card background
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, borderRadius)

  if (isOutlined) {
    ctx.fillStyle = rc.themeBgFill
    ctx.fill()
    ctx.strokeStyle = nodeColor!
    ctx.lineWidth = Math.max(0.5, 0.3 * s)
    ctx.stroke()
  } else {
    ctx.fillStyle = nodeColor!
    ctx.fill()
    ctx.strokeStyle = rc.themeSubtleBorder
    ctx.lineWidth = 0.3
    ctx.stroke()
  }

  // Left color accent bar (outlined only)
  if (isOutlined) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, borderRadius)
    ctx.clip()
    ctx.fillStyle = nodeColor!
    ctx.fillRect(cardX, cardY, accentWidth, cardHeight)
    ctx.restore()
  }

  const iconX = cardX + paddingX + (isOutlined ? accentWidth : 0)
  const iconY = node.y - iconSize / 2

  // Icon + text only when zoomed in enough
  if (rc.shouldRenderDetails) {
    if (showIcons) {
      const iconColor = isOutlined ? (theme === 'dark' ? '#FFFFFF' : '#000000') : '#FFFFFF'
      const visual = getNodeVisual(node, iconColor)

      if (visual) {
        const iconAlpha = rc.hasAnyHighlight && !isHighlighted ? 0.5 : 0.9
        const prevAlpha = ctx.globalAlpha
        ctx.globalAlpha = iconAlpha
        ctx.drawImage(visual.image, iconX, iconY, iconSize, iconSize)
        ctx.globalAlpha = prevAlpha
      }
    }

    const textX = iconX + iconSize + gap
    const textColor = rc.themeTextColor

    if (typeText) {
      ctx.font = `${typeFontSize}px Sans-Serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      if (isOutlined) {
        ctx.fillStyle = isHighlighted ? `${textColor}AA` : `${textColor}77`
      } else {
        ctx.fillStyle = isHighlighted ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)'
      }
      ctx.fillText(typeText, textX, cardY + paddingY)
    }

    if (label) {
      ctx.font = `bold ${labelFontSize}px Sans-Serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      if (isOutlined) {
        ctx.fillStyle = isHighlighted ? textColor : `${textColor}CC`
      } else {
        ctx.fillStyle = isHighlighted ? '#FFFFFF' : 'rgba(255,255,255,0.85)'
      }
      const labelY = cardY + paddingY + (typeText ? typeFontSize + 2 * s : 0)
      ctx.fillText(label, textX, labelY)
    }
  }

  // Flag
  if (node.nodeFlag) {
    drawCardFlag(ctx, node, cardX, cardY, cardWidth, s)
  }
}

// --- Dot-style node renderer ---

const renderDotNode = (params: NodeRenderParams) => {
  const {
    node,
    ctx,
    forceSettings,
    showLabels,
    showIcons,
    isCurrent,
    isSelected,
    theme,
    highlightNodes,
    hoverNode,
    rc
  } = params
  const size = calculateNodeSize(
    node,
    forceSettings,
    rc.shouldRenderDetails,
    CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER
  )

  const isHighlighted = highlightNodes.has(node.id) || isSelected(node.id) || isCurrent(node.id)
  const isHovered = hoverNode === node.id || isCurrent(node.id)
  const shape: NodeShape = node.nodeShape ?? 'circle'

  // Highlight ring
  if (isHighlighted) {
    const borderWidth = 3 / rc.globalScale
    drawNodePath(ctx, node.x, node.y, size + borderWidth, shape)
    ctx.fillStyle = isHovered
      ? GRAPH_COLORS.NODE_HIGHLIGHT_HOVER
      : GRAPH_COLORS.NODE_HIGHLIGHT_DEFAULT
    ctx.fill()
  }

  const nodeColor = rc.hasAnyHighlight
    ? isHighlighted
      ? node.nodeColor!
      : getDimmedColor(rc, node.nodeColor!)
    : node.nodeColor!

  const isOutlined = forceSettings.nodeOutlined?.value ?? false

  // Draw shape (fill + stroke in one path)
  drawNodeShape(ctx, node.x, node.y, size, shape, nodeColor, isOutlined, rc)

  // Flag
  if (node.nodeFlag) {
    drawFlag(ctx, node, size)
  }

  // Zoomed out: mock label and early return
  if (!rc.shouldRenderDetails) {
    drawMockLabel(ctx, node.x, node.y, size, rc)
    return
  }

  // Icons
  if (showIcons) {
    drawNodeIcon(
      ctx, node, node.x, node.y, size, shape,
      isOutlined, isHighlighted, rc.hasAnyHighlight, theme
    )
  }

  // Labels
  if (showLabels) {
    drawNodeLabel(ctx, node, size, isHighlighted, forceSettings, rc)
  }
}

// --- Main dispatcher ---

export const renderNode = (params: NodeRenderParams) => {
  if (!isInViewport(params.node.x, params.node.y, params.ctx)) return

  const isDotStyle = params.forceSettings?.dotStyle?.value ?? true
  if (isDotStyle) {
    renderDotNode(params)
  } else {
    renderCardNode(params)
  }
}

// --- Shape edge distance (for link/arrow positioning) ---

const rectEdgeDistance = (angle: number, halfW: number, halfH: number): number => {
  const absC = Math.abs(Math.cos(angle))
  const absS = Math.abs(Math.sin(angle))
  if (absC < 1e-6) return halfH
  if (absS < 1e-6) return halfW
  return Math.min(halfW / absC, halfH / absS)
}

const squareEdgeDistance = (angle: number, size: number): number => {
  return rectEdgeDistance(angle, size, size)
}

const hexEdgeDistance = (angle: number, size: number): number => {
  const apothem = (size * SQRT3) / 2
  let a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const sectorCenter = Math.round(a / (Math.PI / 3)) * (Math.PI / 3)
  const offset = a - sectorCenter
  return apothem / Math.cos(offset)
}

const triangleEdgeDistance = (angle: number, size: number): number => {
  const h = size * SQRT3
  const vertices = [
    { x: 0, y: -h / 2 },
    { x: size, y: h / 2 },
    { x: -size, y: h / 2 }
  ]

  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  let minDist = Infinity

  for (let i = 0; i < 3; i++) {
    const v1 = vertices[i]
    const v2 = vertices[(i + 1) % 3]
    const ex = v2.x - v1.x
    const ey = v2.y - v1.y
    const denom = dx * ey - dy * ex
    if (Math.abs(denom) < 1e-10) continue

    const t = (v1.x * ey - v1.y * ex) / denom
    const s = (v1.x * dy - v1.y * dx) / denom
    if (t > 0 && s >= 0 && s <= 1) {
      minDist = Math.min(minDist, t)
    }
  }

  return minDist === Infinity ? size : minDist
}

const shapeEdgeDistance = (angle: number, size: number, shape: NodeShape): number => {
  switch (shape) {
    case 'square':
      return squareEdgeDistance(angle, size)
    case 'hexagon':
      return hexEdgeDistance(angle, size)
    case 'triangle':
      return triangleEdgeDistance(angle, size)
    case 'circle':
    default:
      return size
  }
}

export const getNodeEdgeDistance = (
  node: any,
  angle: number,
  forceSettings: any,
  ctx: CanvasRenderingContext2D,
  shouldRenderDetails: boolean
): number => {
  const isDotStyle = forceSettings?.dotStyle?.value ?? true

  if (!isDotStyle) {
    const { cardWidth, cardHeight } = getCardDimensions(node, ctx, forceSettings)
    return rectEdgeDistance(angle, cardWidth / 2, cardHeight / 2)
  }

  const size = calculateNodeSize(
    node,
    forceSettings,
    shouldRenderDetails,
    CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER
  )
  const shape: NodeShape = node.nodeShape ?? 'circle'
  return shapeEdgeDistance(angle, size, shape)
}

// --- Pointer area paint (hitbox) ---

export const paintNodePointerArea = (
  node: GraphNode,
  color: string,
  ctx: CanvasRenderingContext2D,
  forceSettings: any
) => {
  const isDotStyle = forceSettings?.dotStyle?.value ?? true

  if (isDotStyle) {
    const size = calculateNodeSize(node, forceSettings, true, CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER)
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
  } else {
    const { cardWidth, cardHeight } = getCardDimensions(node, ctx, forceSettings)
    ctx.fillStyle = color
    ctx.fillRect(node.x - cardWidth / 2, node.y - cardHeight / 2, cardWidth, cardHeight)
  }
}

import { GraphNode, NodeShape } from '@/types'
import { CONSTANTS, GRAPH_COLORS } from '../utils/constants'
import {
  getCachedImage,
  getCachedFlagImage,
  getCachedIconByName,
  getCachedExternalImage
} from '../utils/image-cache'
import { truncateText, calculateNodeSize } from '../utils/utils'

type NodeVisual = {
  image: HTMLImageElement
  isExternal: boolean
} | null

// Shape path helpers - each creates a path centered at (x, y) with given size
const drawCirclePath = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.arc(x, y, size, 0, 2 * Math.PI)
}

const drawSquarePath = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const half = size
  ctx.rect(x - half, y - half, half * 2, half * 2)
}

const drawHexagonPath = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  // Flat-top hexagon
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const px = x + size * Math.cos(angle)
    const py = y + size * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

const drawTrianglePath = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  // Equilateral triangle pointing up
  const height = size * Math.sqrt(3)
  const topY = y - height / 2
  const bottomY = y + height / 2
  ctx.moveTo(x, topY)
  ctx.lineTo(x + size, bottomY)
  ctx.lineTo(x - size, bottomY)
  ctx.closePath()
}

// Unified shape path drawer
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

// Draws an image with object-cover behavior inside a shape clip
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

  // Calculate cover dimensions (fill the shape, crop excess)
  let drawWidth: number, drawHeight: number
  if (imgAspect > 1) {
    // Landscape: height fills, width overflows
    drawHeight = diameter
    drawWidth = diameter * imgAspect
  } else {
    // Portrait or square: width fills, height overflows
    drawWidth = diameter
    drawHeight = diameter / imgAspect
  }

  drawNodePath(ctx, x, y, size, shape)
  ctx.clip()
  ctx.drawImage(img, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight)
}

// Resolves the visual for a node with priority: nodeImage -> nodeIcon -> nodeType
const getNodeVisual = (node: GraphNode, iconColor: string): NodeVisual => {
  // Priority 1: External image (nodeImage URL)
  if (node.nodeImage) {
    const img = getCachedExternalImage(node.nodeImage)
    if (img?.complete) return { image: img, isExternal: true }
  }

  // Priority 2: Custom icon by name (nodeIcon)
  if (node.nodeIcon) {
    const img = getCachedIconByName(node.nodeIcon, iconColor)
    if (img?.complete) return { image: img, isExternal: false }
  }

  // Priority 3: Type-based icon (nodeType)
  if (node.nodeType) {
    const img = getCachedImage(node.nodeType, iconColor)
    if (img?.complete) return { image: img, isExternal: false }
  }

  return null
}

interface NodeRenderParams {
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
}

// Helper to check if node is in viewport
const isInViewport = (node: any, ctx: CanvasRenderingContext2D, margin: number = 80): boolean => {
  const transform = ctx.getTransform()
  const canvasWidth = ctx.canvas.width
  const canvasHeight = ctx.canvas.height

  // Transform node position to screen coordinates
  const screenX = node.x * transform.a + transform.e
  const screenY = node.y * transform.d + transform.f

  // Check if within viewport bounds (with margin for smoother culling)
  return (
    screenX >= -margin &&
    screenX <= canvasWidth + margin &&
    screenY >= -margin &&
    screenY <= canvasHeight + margin
  )
}

export const renderNode = ({
  node,
  ctx,
  globalScale,
  forceSettings,
  showLabels,
  showIcons,
  isCurrent,
  isSelected,
  theme,
  highlightNodes,
  highlightLinks,
  hoverNode
}: NodeRenderParams) => {
  // Early exit: skip entire node if outside viewport
  const inViewport = isInViewport(node, ctx)
  if (!inViewport) return

  const shouldRenderDetails = globalScale > CONSTANTS.ZOOM_NODE_DETAIL_THRESHOLD
  const size = calculateNodeSize(
    node,
    forceSettings,
    shouldRenderDetails,
    CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER
  )

  const isHighlighted = highlightNodes.has(node.id) || isSelected(node.id) || isCurrent(node.id)
  const hasAnyHighlight = highlightNodes.size > 0 || highlightLinks.size > 0
  const isHovered = hoverNode === node.id || isCurrent(node.id)
  const shape: NodeShape = node.nodeShape ?? 'circle'

  // Draw highlight ring
  if (isHighlighted) {
    const borderWidth = 3 / globalScale
    drawNodePath(ctx, node.x, node.y, size + borderWidth, shape)
    ctx.fillStyle = isHovered
      ? GRAPH_COLORS.NODE_HIGHLIGHT_HOVER
      : GRAPH_COLORS.NODE_HIGHLIGHT_DEFAULT
    ctx.fill()
  }

  // Set node color
  const nodeColor = hasAnyHighlight
    ? isHighlighted
      ? node.nodeColor
      : `${node.nodeColor}7D`
    : node.nodeColor

  const isOutlined = forceSettings.nodeOutlined?.value ?? false

  // Draw node shape (filled or outlined)
  drawNodePath(ctx, node.x, node.y, size, shape)

  if (isOutlined) {
    // Fill background: white in light mode, dark in dark mode
    ctx.fillStyle = theme === 'light' ? '#FFFFFF' : '#1a1a1a'
    ctx.fill()
    // Draw colored outline
    ctx.strokeStyle = nodeColor
    ctx.lineWidth = Math.max(2, size * 0.15) / globalScale
    ctx.stroke()
  } else {
    ctx.fillStyle = nodeColor
    ctx.fill()
    // Draw subtle border for filled nodes
    drawNodePath(ctx, node.x, node.y, size, shape)
    ctx.strokeStyle = theme === 'light' ? 'rgba(44, 44, 44, 0.19)' : 'rgba(222, 222, 222, 0.13)'
    ctx.lineWidth = 0.3
    ctx.stroke()
  }

  // Only render details if zoomed in enough
  if (!shouldRenderDetails) {
    // render flag
    if (node.nodeFlag) {
      const flagColors: Record<string, { stroke: string; fill: string }> = {
        red: { stroke: '#f87171', fill: '#fecaca' },
        orange: { stroke: '#fb923c', fill: '#fed7aa' },
        blue: { stroke: '#60a5fa', fill: '#bfdbfe' },
        green: { stroke: '#4ade80', fill: '#bbf7d0' },
        yellow: { stroke: '#facc15', fill: '#fef08a' }
      }

      const flagColor = flagColors[node.nodeFlag]
      if (flagColor) {
        const cachedFlag = getCachedFlagImage(flagColor.stroke, flagColor.fill)
        if (cachedFlag && cachedFlag.complete) {
          try {
            const flagSize = size * 0.8
            const flagX = node.x + 0.8 + size * 0.5 - flagSize / 2
            const flagY = node.y - 1.4 - size * 0.5 - flagSize / 2

            ctx.save()
            ctx.globalAlpha = 1
            ctx.drawImage(cachedFlag, flagX, flagY, flagSize, flagSize)
            ctx.restore()
          } catch (error) {
            console.warn('[node-renderer] Failed to draw flag:', error)
          }
        }
      }
    }

    // Draw a small rectangle to mock a label under the node
    const mockLabelWidth = 15
    const mockLabelHeight = 3
    const mockLabelY = node.y + size + mockLabelHeight * 0.5
    const mockLabelX = node.x - mockLabelWidth / 2
    const borderRadius = mockLabelHeight * 0.3

    ctx.beginPath()
    ctx.roundRect(mockLabelX, mockLabelY, mockLabelWidth, mockLabelHeight, borderRadius)
    ctx.fillStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'
    ctx.fill()
    return
  }

  // Draw flag if present
  if (node.nodeFlag) {
    const flagColors: Record<string, { stroke: string; fill: string }> = {
      red: { stroke: '#f87171', fill: '#fecaca' },
      orange: { stroke: '#fb923c', fill: '#fed7aa' },
      blue: { stroke: '#60a5fa', fill: '#bfdbfe' },
      green: { stroke: '#4ade80', fill: '#bbf7d0' },
      yellow: { stroke: '#facc15', fill: '#fef08a' }
    }

    const flagColor = flagColors[node.nodeFlag]
    if (flagColor) {
      const cachedFlag = getCachedFlagImage(flagColor.stroke, flagColor.fill)
      if (cachedFlag && cachedFlag.complete) {
        try {
          const flagSize = size * 0.8
          const flagX = node.x + 0.8 + size * 0.5 - flagSize / 2
          const flagY = node.y - 1.4 - size * 0.5 - flagSize / 2

          ctx.save()
          ctx.globalAlpha = 1
          ctx.drawImage(cachedFlag, flagX, flagY, flagSize, flagSize)
          ctx.restore()
        } catch (error) {
          console.warn('[node-renderer] Failed to draw flag:', error)
        }
      }
    }
  }

  // Render icons/images
  if (showIcons) {
    const iconColor = isOutlined ? (theme === 'dark' ? '#FFFFFF' : '#000000') : '#FFFFFF'
    const visual = getNodeVisual(node, iconColor)

    if (visual) {
      try {
        const iconAlpha = hasAnyHighlight && !isHighlighted ? 0.5 : 0.9
        ctx.save()
        ctx.globalAlpha = iconAlpha

        if (visual.isExternal) {
          // External image: clipped to shape, 90% of node size, object-cover
          const imgSize = size * 0.9
          drawClippedImage(ctx, visual.image, node.x, node.y, imgSize, shape)
        } else {
          // Icon: draw normally
          const iconSize = size * 1.2
          ctx.drawImage(
            visual.image,
            node.x - iconSize / 2,
            node.y - iconSize / 2,
            iconSize,
            iconSize
          )
        }

        ctx.restore()
      } catch (error) {}
    }
  }

  // Render labels
  if (showLabels) {
    const anonymise = false // TODO
    const label = anonymise ? '**************' : truncateText(node.nodeLabel || node.id, 58)
    if (label) {
      const baseFontSize = Math.max(
        CONSTANTS.MIN_FONT_SIZE,
        (CONSTANTS.NODE_FONT_SIZE * (size / 2)) / globalScale + 2
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

      // Draw background
      const bgX = node.x - bgWidth / 2
      ctx.beginPath()
      ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius)

      if (theme === 'light') {
        ctx.fillStyle = isHighlighted ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.75)'
      } else {
        ctx.fillStyle = isHighlighted ? 'rgba(32, 32, 32, 0.95)' : 'rgba(32, 32, 32, 0.75)'
      }
      ctx.fill()

      ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 0.1
      ctx.stroke()

      // Draw text with consistent baseline across browsers
      const color = theme === 'light' ? GRAPH_COLORS.TEXT_LIGHT : GRAPH_COLORS.TEXT_DARK
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic' // More consistent across browsers than 'middle'
      ctx.fillStyle = isHighlighted ? color : `${color}CC`

      const metrics = ctx.measureText(label)
      const textY = bgY + paddingY + metrics.actualBoundingBoxAscent
      ctx.fillText(label, node.x, textY)
    }
  }
}

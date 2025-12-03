import { CONSTANTS, GRAPH_COLORS } from './constants'
import { getCachedImage } from './image-cache'
import { truncateText } from './utils'

interface NodeRenderParams {
  node: any
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

  const sizeMultiplier = forceSettings.nodeSize.value / 100 + 0.2
  const neighborBonus = Math.min(node.neighbors.length / 5, 5)
  const baseSize = (node.nodeSize + neighborBonus) * sizeMultiplier

  const shouldRenderDetails = globalScale > CONSTANTS.ZOOM_NODE_DETAIL_THRESHOLD

  const size = shouldRenderDetails
    ? baseSize
    : baseSize * CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER

  const isHighlighted = highlightNodes.has(node.id) || isSelected(node.id) || isCurrent(node.id)
  const hasAnyHighlight = highlightNodes.size > 0 || highlightLinks.size > 0
  const isHovered = hoverNode === node.id || isCurrent(node.id)

  // Draw highlight ring
  if (isHighlighted) {
    const borderWidth = 3 / globalScale
    ctx.beginPath()
    ctx.arc(node.x, node.y, size + borderWidth, 0, 2 * Math.PI)
    ctx.fillStyle = isHovered
      ? GRAPH_COLORS.NODE_HIGHLIGHT_HOVER
      : GRAPH_COLORS.NODE_HIGHLIGHT_DEFAULT
    ctx.fill()
  }

  // Set node color
  if (hasAnyHighlight) {
    ctx.fillStyle = isHighlighted ? node.nodeColor : `${node.nodeColor}7D`
  } else {
    ctx.fillStyle = node.nodeColor
  }

  // Draw node circle
  ctx.beginPath()
  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
  ctx.fill()

  // Only render details if zoomed in enough
  if (!shouldRenderDetails) return

  // Render icons
  if (showIcons && node.nodeType) {
    const cachedImage = getCachedImage(node.nodeType)
    if (cachedImage && cachedImage.complete) {
      try {
        ctx.drawImage(cachedImage, node.x - size / 2, node.y - size / 2, size, size)
      } catch (error) {
        // Silent fail
      }
    }
  }

  // Render labels
  if (showLabels) {
    const label = truncateText(node.nodeLabel || node.label || node.id, 58)
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
        ctx.fillStyle = isHighlighted
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(255, 255, 255, 0.75)'
      } else {
        ctx.fillStyle = isHighlighted
          ? 'rgba(32, 32, 32, 0.95)'
          : 'rgba(32, 32, 32, 0.75)'
      }
      ctx.fill()

      ctx.strokeStyle = theme === 'light'
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 0.1
      ctx.stroke()

      // Draw text
      const color = theme === 'light' ? GRAPH_COLORS.TEXT_LIGHT : GRAPH_COLORS.TEXT_DARK
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isHighlighted ? color : `${color}CC`
      ctx.fillText(label, node.x, bgY + bgHeight / 2)
    }
  }
}

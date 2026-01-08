import { CONSTANTS, GRAPH_COLORS } from '../utils/constants'
import { getCachedImage, getCachedFlagImage } from '../utils/image-cache'
import { truncateText, calculateNodeSize } from '../utils/utils'

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

  const shouldRenderDetails = globalScale > CONSTANTS.ZOOM_NODE_DETAIL_THRESHOLD
  const size = calculateNodeSize(node, forceSettings, shouldRenderDetails, CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER)

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
  const nodeColor = hasAnyHighlight
    ? isHighlighted
      ? node.nodeColor
      : `${node.nodeColor}7D`
    : node.nodeColor

  const isOutlined = forceSettings.nodeOutlined?.value ?? false

  // Draw node circle (filled or outlined)
  ctx.beginPath()
  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)

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
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
    ctx.strokeStyle = theme === 'light' ? 'rgba(44, 44, 44, 0.19)' : 'rgba(222, 222, 222, 0.13)'
    ctx.lineWidth = 0.3
    ctx.stroke()
  }

  // Only render details if zoomed in enough
  if (!shouldRenderDetails) return

  // Draw flag if present
  if (node.data?.flag) {
    const flagColors: Record<string, { stroke: string; fill: string }> = {
      red: { stroke: '#f87171', fill: '#fecaca' },
      orange: { stroke: '#fb923c', fill: '#fed7aa' },
      blue: { stroke: '#60a5fa', fill: '#bfdbfe' },
      green: { stroke: '#4ade80', fill: '#bbf7d0' },
      yellow: { stroke: '#facc15', fill: '#fef08a' }
    }

    const flagColor = flagColors[node.data.flag]
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

  // Render icons
  if (showIcons && node.nodeType) {
    // In outlined mode: white for dark theme, black for light theme
    // In filled mode: always white
    const iconColor = isOutlined ? (theme === 'dark' ? '#FFFFFF' : '#000000') : '#FFFFFF'
    const cachedImage = getCachedImage(node.nodeType, iconColor)
    if (cachedImage && cachedImage.complete) {
      try {
        // Dessiner l'icône au centre du node
        const iconSize = size * 1.2
        ctx.save()
        // Apply transparency if node is not highlighted
        const iconAlpha = hasAnyHighlight && !isHighlighted ? 0.5 : 0.9
        ctx.globalAlpha = iconAlpha
        ctx.drawImage(cachedImage, node.x - iconSize / 2, node.y - iconSize / 2, iconSize, iconSize)
        ctx.restore()
      } catch (error) {}
    } else {
      console.warn(
        '[node-renderer] No cached image for type:',
        node.nodeType,
        'color:',
        iconColor,
        'complete:',
        cachedImage?.complete
      )
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

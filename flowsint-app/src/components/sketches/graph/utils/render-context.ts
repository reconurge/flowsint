import { CONSTANTS, GRAPH_COLORS } from './constants'

/**
 * Pre-computed per-frame values to avoid redundant work in per-element render loops.
 * Create once per frame via `createRenderContext()`, pass into every renderNode/renderLink call.
 *
 * NOTE: Canvas transform is NOT cached here. It must be read fresh from `ctx` in viewport
 * checks because panning changes the transform without changing globalScale or any React
 * dependency, which would cause stale culling (nodes hidden when they shouldn't be).
 */
export interface RenderContext {
  // Pre-computed flags
  hasAnyHighlight: boolean
  shouldRenderDetails: boolean
  globalScale: number

  // Selected edges as Set for O(1) lookup
  selectedEdgeIds: Set<string>

  // Theme-resolved colors
  themeBgFill: string
  themeSubtleBorder: string
  themeMockLabelFill: string
  themeLabelBg: string
  themeLabelBgHighlighted: string
  themeLabelBorder: string
  themeTextColor: string
  themeEdgeLabelBg: string

  // Dimmed color cache (nodeColor -> nodeColor + "7D")
  dimmedColorCache: Map<string, string>
}

export const createRenderContext = (
  globalScale: number,
  highlightNodes: Set<string>,
  highlightLinks: Set<string>,
  selectedEdges: { id: string }[],
  theme: string
): RenderContext => {
  const isLight = theme === 'light'

  return {
    hasAnyHighlight: highlightNodes.size > 0 || highlightLinks.size > 0,
    shouldRenderDetails: globalScale > CONSTANTS.ZOOM_NODE_DETAIL_THRESHOLD,
    globalScale,

    selectedEdgeIds: new Set(selectedEdges.map((e) => e.id)),

    themeBgFill: isLight ? '#FFFFFF' : '#1a1a1a',
    themeSubtleBorder: isLight
      ? 'rgba(44, 44, 44, 0.19)'
      : 'rgba(222, 222, 222, 0.13)',
    themeMockLabelFill: isLight
      ? 'rgba(0, 0, 0, 0.15)'
      : 'rgba(255, 255, 255, 0.15)',
    themeLabelBg: isLight
      ? 'rgba(255, 255, 255, 0.75)'
      : 'rgba(32, 32, 32, 0.75)',
    themeLabelBgHighlighted: isLight
      ? 'rgba(255, 255, 255, 0.95)'
      : 'rgba(32, 32, 32, 0.95)',
    themeLabelBorder: isLight
      ? 'rgba(0, 0, 0, 0.1)'
      : 'rgba(255, 255, 255, 0.1)',
    themeTextColor: isLight ? GRAPH_COLORS.TEXT_LIGHT : GRAPH_COLORS.TEXT_DARK,
    themeEdgeLabelBg: isLight
      ? 'rgba(255, 255, 255, 0.95)'
      : 'rgba(32, 32, 32, 0.95)',

    dimmedColorCache: new Map()
  }
}

/** Get dimmed color with caching to avoid string allocation per element */
export const getDimmedColor = (rc: RenderContext, color: string): string => {
  let dimmed = rc.dimmedColorCache.get(color)
  if (!dimmed) {
    dimmed = `${color}7D`
    rc.dimmedColorCache.set(color, dimmed)
  }
  return dimmed
}

/** Viewport check — reads transform fresh from ctx to stay correct during pan */
export const isInViewport = (
  x: number,
  y: number,
  ctx: CanvasRenderingContext2D,
  margin: number = 80
): boolean => {
  const transform = ctx.getTransform()
  const screenX = x * transform.a + transform.e
  const screenY = y * transform.d + transform.f
  return (
    screenX >= -margin &&
    screenX <= ctx.canvas.width + margin &&
    screenY >= -margin &&
    screenY <= ctx.canvas.height + margin
  )
}

/** Edge viewport check — reads transform fresh from ctx to stay correct during pan */
export const isEdgeInViewport = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  ctx: CanvasRenderingContext2D,
  margin: number = 80
): boolean => {
  const transform = ctx.getTransform()
  const canvasWidth = ctx.canvas.width
  const canvasHeight = ctx.canvas.height

  const screenStartX = startX * transform.a + transform.e
  const screenStartY = startY * transform.d + transform.f

  if (
    screenStartX >= -margin &&
    screenStartX <= canvasWidth + margin &&
    screenStartY >= -margin &&
    screenStartY <= canvasHeight + margin
  ) return true

  const screenEndX = endX * transform.a + transform.e
  const screenEndY = endY * transform.d + transform.f

  if (
    screenEndX >= -margin &&
    screenEndX <= canvasWidth + margin &&
    screenEndY >= -margin &&
    screenEndY <= canvasHeight + margin
  ) return true

  // AABB intersection (edge might cross viewport even if both endpoints are outside)
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

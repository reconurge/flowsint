import { GraphNode } from '@/types'
import { useMemo } from 'react'
import { GRAPH_COLORS } from './graph-viewer'

interface zoomTransform {
  x: number
  y: number
  k: number
}
interface MinimapProps {
  nodes: GraphNode[]
  zoomTransform: zoomTransform
  width?: number
  height?: number
  canvasWidth: number
  canvasHeight: number
}
const Minimap = ({
  nodes,
  zoomTransform,
  width = 160,
  height = 120,
  canvasWidth = 800,
  canvasHeight = 600
}: MinimapProps) => {
  // Calculate the visible viewport in world coordinates
  const invScale = 1 / zoomTransform.k

  // The viewport center in world coordinates
  // zoomTransform.x and zoomTransform.y are screen offsets, so we need to convert them
  const viewportCenterX = zoomTransform.x * invScale
  const viewportCenterY = zoomTransform.y * invScale

  // Viewport dimensions in world coordinates
  const viewportWidth = canvasWidth * invScale
  const viewportHeight = canvasHeight * invScale

  // Viewport bounds in world coordinates
  const viewportX1 = viewportCenterX - viewportWidth / 2
  const viewportY1 = viewportCenterY - viewportHeight / 2
  const viewportX2 = viewportCenterX + viewportWidth / 2
  const viewportY2 = viewportCenterY + viewportHeight / 2

  // Calculate global bounding box including nodes and viewport
  const [minX, minY, maxX, maxY] = useMemo(() => {
    const validNodes = nodes.filter((n) => typeof n.x === 'number' && typeof n.y === 'number')

    if (validNodes.length === 0) {
      // If no nodes, just show the viewport
      return [viewportX1, viewportY1, viewportX2, viewportY2]
    }

    const nodeXs = validNodes.map((n) => n.x)
    const nodeYs = validNodes.map((n) => n.y)

    const allX = [...nodeXs, viewportX1, viewportX2]
    const allY = [...nodeYs, viewportY1, viewportY2]

    return [
      Math.min(...allX.filter((x): x is number => x !== undefined)),
      Math.min(...allY.filter((y): y is number => y !== undefined)),
      Math.max(...allX.filter((x): x is number => x !== undefined)),
      Math.max(...allY.filter((y): y is number => y !== undefined))
    ]
  }, [nodes, viewportX1, viewportY1, viewportX2, viewportY2])

  const worldWidth = maxX - minX || 1
  const worldHeight = maxY - minY || 1

  // Scale to fit everything in the minimap
  const scaleX = width / worldWidth
  const scaleY = height / worldHeight
  const scale = Math.min(scaleX, scaleY)

  // Center the minimap content
  const offsetX = (width - worldWidth * scale) / 2
  const offsetY = (height - worldHeight * scale) / 2

  // Project world coordinates to minimap coordinates
  const project = (x, y) => [(x - minX) * scale + offsetX, (y - minY) * scale + offsetY]

  // Project viewport bounds to minimap coordinates
  const [vx1, vy1] = project(viewportX1, viewportY1)
  const [vx2, vy2] = project(viewportX2, viewportY2)

  // Calculate viewBox dimensions with padding
  const viewBoxWidth = Math.abs(vx2 - vx1) + 6
  const viewBoxHeight = Math.abs(vy2 - vy1) + 6

  // Position the viewBox to show the current viewport
  const viewBoxX = Math.min(vx1, vx2) - 3
  const viewBoxY = Math.min(vy1, vy2) - 3

  // Fixed node radius for consistent sizing
  const nodeRadius = 2

  return (
    <div
      style={{ width: width, height: height }}
      className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm overflow-hidden border border-border rounded-lg"
    >
      <svg
        width={width}
        height={height}
        className="bg-transparent"
        style={{ backgroundColor: 'transparent' }}
      >
        {nodes
          .filter((n: GraphNode) => typeof n.x === 'number' && typeof n.y === 'number')
          .map((n: GraphNode, i: number) => {
            const [cx, cy] = project(n.x, n.y)
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={nodeRadius}
                fill={n.nodeColor || 'currentColor'}
                className="text-foreground"
              />
            )
          })}

        {/* Viewport rectangle - shows current visible area */}
        <rect
          x={viewBoxX}
          y={viewBoxY}
          rx={4}
          ry={4}
          width={viewBoxWidth}
          height={viewBoxHeight}
          fill={GRAPH_COLORS.LASSO_FILL}
          stroke={GRAPH_COLORS.LASSO_STROKE}
          strokeWidth={1}
        />
      </svg>
    </div>
  )
}

export default Minimap

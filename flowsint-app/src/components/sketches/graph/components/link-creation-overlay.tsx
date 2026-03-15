import { useCallback, useRef, type PointerEvent } from 'react'
import { type GraphNode } from '@/types'

function getRelativeCoordinates(
  e: PointerEvent,
  canvas: HTMLCanvasElement | null
): [number, number] {
  const rect = canvas?.getBoundingClientRect()
  if (!rect) return [0, 0]
  return [e.clientX - rect.left, e.clientY - rect.top]
}

interface LinkCreationCanvasProps {
  nodes: any[]
  graph2ScreenCoords: (node: any) => { x: number; y: number }
  width: number
  height: number
  onStartLinking: (node: GraphNode) => void
  onCompleteLinking: (node: GraphNode, screenX: number, screenY: number) => void
  onCancel: () => void
  sourceNode: GraphNode | null
}

const NODE_HIT_RADIUS_PX = 20

export function LinkCreationCanvas({
  nodes,
  graph2ScreenCoords,
  width,
  height,
  onStartLinking,
  onCompleteLinking,
  onCancel,
  sourceNode
}: LinkCreationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const sourceScreenRef = useRef<[number, number] | null>(null)
  const hoveredNodeRef = useRef<GraphNode | null>(null)

  const nodeScreenPosRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  const findNodeAtScreenCoords = useCallback(
    (sx: number, sy: number, excludeId?: string): GraphNode | null => {
      let closest: GraphNode | null = null
      let closestDist = NODE_HIT_RADIUS_PX

      for (const node of nodes) {
        if (node.id === excludeId) continue
        const pos = nodeScreenPosRef.current.get(node.id)
        if (!pos) continue
        const dx = pos.x - sx
        const dy = pos.y - sy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < closestDist) {
          closestDist = dist
          closest = node
        }
      }
      return closest
    },
    [nodes]
  )

  const drawLine = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      hovered: boolean
    ) => {
      ctx.clearRect(0, 0, width, height)

      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.strokeStyle = hovered ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.5)'
      ctx.lineWidth = hovered ? 2.5 : 2
      ctx.setLineDash(hovered ? [] : [8, 4])
      ctx.stroke()
      ctx.setLineDash([])

      const angle = Math.atan2(toY - fromY, toX - fromX)
      const arrowLen = 10
      ctx.beginPath()
      ctx.moveTo(toX, toY)
      ctx.lineTo(toX - arrowLen * Math.cos(angle - 0.4), toY - arrowLen * Math.sin(angle - 0.4))
      ctx.lineTo(toX - arrowLen * Math.cos(angle + 0.4), toY - arrowLen * Math.sin(angle + 0.4))
      ctx.closePath()
      ctx.fillStyle = hovered ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.5)'
      ctx.fill()

      if (hovered) {
        ctx.beginPath()
        ctx.arc(toX, toY, 14, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    },
    [width, height]
  )

  function handlePointerDown(e: PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return

    nodeScreenPosRef.current.clear()
    for (const node of nodes) {
      const pos = graph2ScreenCoords(node)
      nodeScreenPosRef.current.set(node.id, pos)
    }

    const [sx, sy] = getRelativeCoordinates(e, canvas)
    const hitNode = findNodeAtScreenCoords(sx, sy)

    if (!hitNode) return

    canvas.setPointerCapture(e.pointerId)

    const pos = nodeScreenPosRef.current.get(hitNode.id)
    sourceScreenRef.current = pos ? [pos.x, pos.y] : [sx, sy]
    hoveredNodeRef.current = null

    const ctx = canvas.getContext('2d')
    if (ctx) ctxRef.current = ctx

    onStartLinking(hitNode)
  }

  function handlePointerMove(e: PointerEvent) {
    if (e.buttons !== 1 || !sourceScreenRef.current) return

    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return

    const [sx, sy] = getRelativeCoordinates(e, canvas)
    const hovered = findNodeAtScreenCoords(sx, sy, sourceNode?.id)
    hoveredNodeRef.current = hovered

    const hoveredPos = hovered ? nodeScreenPosRef.current.get(hovered.id) : null
    const endX = hoveredPos ? hoveredPos.x : sx
    const endY = hoveredPos ? hoveredPos.y : sy

    drawLine(ctx, sourceScreenRef.current[0], sourceScreenRef.current[1], endX, endY, !!hovered)
  }

  function handlePointerUp(e: PointerEvent) {
    canvasRef.current?.releasePointerCapture(e.pointerId)
    ctxRef.current?.clearRect(0, 0, width, height)

    const hovered = hoveredNodeRef.current
    const [sx, sy] = getRelativeCoordinates(e, canvasRef.current)
    sourceScreenRef.current = null
    hoveredNodeRef.current = null

    if (hovered) {
      onCompleteLinking(hovered, sx, sy)
    } else {
      onCancel()
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="tool-overlay"
      style={{ cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  )
}

import { memo, useRef, type PointerEvent } from 'react'
import { useGraphStore } from '@/stores/graph-store'
import { GraphNode } from '@/types'
import { GRAPH_COLORS } from '../graph-viewer'

type NodePoints = ([number, number] | [number, number, number])[]
type NodePointObject = Record<string, NodePoints>

// Coordonnées relatives au canvas (évite le décalage)
function getRelativeCoordinates(
  e: PointerEvent,
  canvas: HTMLCanvasElement | null
): [number, number] {
  const rect = canvas?.getBoundingClientRect()
  if (!rect) return [0, 0]
  return [e.clientX - rect.left, e.clientY - rect.top]
}

export function Rectangle({
  partial,
  width,
  height,
  graph2ScreenCoords,
  nodes
}: {
  partial: boolean
  width: number
  height: number
  graph2ScreenCoords: (node: GraphNode) => { x: number; y: number }
  nodes: GraphNode[]
}) {
  const setSelectedNodes = useGraphStore((s) => s.setSelectedNodes)
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const setCurrentNodeId = useGraphStore((s) => s.setCurrentNodeId)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const startPointRef = useRef<[number, number] | null>(null)
  const nodePointsRef = useRef<NodePointObject>({})
  const lastSelectedIds = useRef<Set<string>>(new Set())

  function handlePointerDown(e: PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.setPointerCapture(e.pointerId)
    startPointRef.current = getRelativeCoordinates(e, canvas)

    nodePointsRef.current = {}
    for (const node of nodes) {
      const { x, y } = graph2ScreenCoords(node)
      const w = 4,
        h = 4
      nodePointsRef.current[node.id] = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h]
      ]
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctxRef.current = ctx
    ctx.lineWidth = 1.5
    ctx.fillStyle = `${GRAPH_COLORS.LASSO_FILL}`
    ctx.strokeStyle = GRAPH_COLORS.LASSO_STROKE
    ctx.setLineDash([5, 5]) // Dashed pattern: 5px dash, 5px gap
  }

  function handlePointerMove(e: PointerEvent) {
    if (e.buttons !== 1) return

    const canvas = canvasRef.current
    const ctx = ctxRef.current
    const startPoint = startPointRef.current
    if (!canvas || !ctx || !startPoint) return

    const currentPoint = getRelativeCoordinates(e, canvas)

    // Calculer les coordonnées du rectangle
    const x = Math.min(startPoint[0], currentPoint[0])
    const y = Math.min(startPoint[1], currentPoint[1])
    const rectWidth = Math.abs(currentPoint[0] - startPoint[0])
    const rectHeight = Math.abs(currentPoint[1] - startPoint[1])

    // Dessiner le rectangle
    ctx.clearRect(0, 0, width, height)
    const path = new Path2D()
    path.rect(x, y, rectWidth, rectHeight)
    ctx.fill(path)
    ctx.stroke(path)

    const localSelectedNodes: GraphNode[] = []

    for (const [nodeId, points] of Object.entries(nodePointsRef.current)) {
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) continue

      const isSelected = partial
        ? points.some(([px, py]) => ctx.isPointInPath(path, px, py))
        : points.every(([px, py]) => ctx.isPointInPath(path, px, py))

      if (isSelected) {
        localSelectedNodes.push(node)
      }
    }
    const newIds = new Set(localSelectedNodes.map((n) => n.id))
    const oldIds = lastSelectedIds.current

    let changed = newIds.size !== oldIds.size
    if (!changed) {
      for (const id of newIds) {
        if (!oldIds.has(id)) {
          changed = true
          break
        }
      }
    }

    if (changed) {
      lastSelectedIds.current = newIds
      setSelectedNodes(localSelectedNodes)
    }
  }

  function handlePointerUp(e: PointerEvent) {
    canvasRef.current?.releasePointerCapture(e.pointerId)
    startPointRef.current = null
    if (selectedNodes.length === 1) setCurrentNodeId(selectedNodes[0].id)
    ctxRef.current?.clearRect(0, 0, width, height)
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="tool-overlay"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  )
}

export default memo(Rectangle)

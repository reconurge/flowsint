import { memo, useRef, type PointerEvent } from 'react'
import { useGraphStore } from '@/stores/graph-store'
import { GraphNode } from '@/types'
import { GRAPH_COLORS } from '../graph-viewer'

type NodePoints = ([number, number] | [number, number, number])[]
type NodePointObject = Record<string, NodePoints>

// Utilitaire pour générer un chemin SVG fermé à partir de points
function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return ''

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, ',', (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )

  d.push('Z')
  return d.join(' ')
}

// Coordonnées relatives au canvas (évite le décalage)
function getRelativeCoordinates(
  e: PointerEvent,
  canvas: HTMLCanvasElement | null
): [number, number] {
  const rect = canvas?.getBoundingClientRect()
  if (!rect) return [0, 0]
  return [e.clientX - rect.left, e.clientY - rect.top]
}

export function Lasso({
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
  const pointRef = useRef<[number, number][]>([])
  const nodePointsRef = useRef<NodePointObject>({})
  const lastSelectedIds = useRef<Set<string>>(new Set())

  function handlePointerDown(e: PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.setPointerCapture(e.pointerId)
    pointRef.current = [getRelativeCoordinates(e, canvas)]

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
    ctx.lineWidth = 1
    ctx.fillStyle = `${GRAPH_COLORS.LASSO_FILL}`
    ctx.strokeStyle = GRAPH_COLORS.LASSO_STROKE
  }

  function handlePointerMove(e: PointerEvent) {
    if (e.buttons !== 1) return

    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return

    pointRef.current.push(getRelativeCoordinates(e, canvas))

    const path = new Path2D(getSvgPathFromStroke(pointRef.current))
    ctx.clearRect(0, 0, width, height)
    ctx.fill(path)
    ctx.stroke(path)

    const localSelectedNodes: GraphNode[] = []

    for (const [nodeId, points] of Object.entries(nodePointsRef.current)) {
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) continue

      const isSelected = partial
        ? points.some(([x, y]) => ctx.isPointInPath(path, x, y))
        : points.every(([x, y]) => ctx.isPointInPath(path, x, y))

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
    pointRef.current = []
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

export default memo(Lasso)

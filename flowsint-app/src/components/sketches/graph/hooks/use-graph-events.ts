import { useCallback } from 'react'
import { GraphNode, GraphEdge } from '@/types'

interface UseGraphEventsParams {
  onNodeClick?: (node: GraphNode, event: MouseEvent) => void
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void
  onEdgeRightClick?: (edge: GraphEdge, event: MouseEvent) => void
  onBackgroundClick?: () => void
  onBackgroundRightClick?: (event: MouseEvent) => void
  autoZoomOnCurrentNode: boolean
  autoZoomOnNode: boolean
  graphRef: React.RefObject<any>
  edgeMap: Map<string, GraphEdge>
  toggleEdgeSelection: (edge: GraphEdge, multi: boolean) => void
  setCurrentEdgeId: (edgeId: string | null) => void
  clearSelectedEdges: () => void
  saveAllNodePositions: (nodes: any[]) => void
}

export const useGraphEvents = ({
  onNodeClick,
  onNodeRightClick,
  onEdgeRightClick,
  onBackgroundClick,
  onBackgroundRightClick,
  autoZoomOnCurrentNode,
  autoZoomOnNode,
  graphRef,
  edgeMap,
  toggleEdgeSelection,
  setCurrentEdgeId,
  clearSelectedEdges,
  saveAllNodePositions
}: UseGraphEventsParams) => {
  const handleNodeClick = useCallback(
    (node: any, event: MouseEvent) => {
      onNodeClick?.(node, event)

      const isMultiSelect = event.ctrlKey || event.shiftKey
      if (autoZoomOnCurrentNode && !isMultiSelect && node?.x && node?.y && graphRef.current) {
        setTimeout(() => {
          if (
            graphRef.current &&
            autoZoomOnNode &&
            typeof graphRef.current.centerAt === 'function'
          ) {
            graphRef.current.centerAt(node.x, node.y, 400)
            if (typeof graphRef.current.zoom === 'function') {
              graphRef.current.zoom(6, 400)
            }
          }
        }, 100)
      }
    },
    [onNodeClick, autoZoomOnCurrentNode, autoZoomOnNode, graphRef]
  )

  const handleNodeRightClick = useCallback(
    (node: any, event: MouseEvent) => {
      onNodeRightClick?.(node, event)
    },
    [onNodeRightClick]
  )

  const handleEdgeRightClick = useCallback(
    (edge: any, event: MouseEvent) => {
      onEdgeRightClick?.(edge, event)
    },
    [onEdgeRightClick]
  )

  const handleEdgeClick = useCallback(
    (edge: any, event: MouseEvent) => {
      event.stopPropagation()
      const isMultiSelect = event.ctrlKey || event.shiftKey
      const fullEdge = edgeMap.get(edge.id)

      if (!fullEdge) return

      if (isMultiSelect) {
        toggleEdgeSelection(fullEdge, true)
      } else {
        setCurrentEdgeId(fullEdge.id)
        clearSelectedEdges()
      }
    },
    [toggleEdgeSelection, setCurrentEdgeId, clearSelectedEdges, edgeMap]
  )

  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.()
  }, [onBackgroundClick])

  const handleBackgroundRightClick = useCallback(
    (event: MouseEvent) => {
      onBackgroundRightClick?.(event)
    },
    [onBackgroundRightClick]
  )

  const handleNodeDragEnd = useCallback(
    (node: any, graphData: any) => {
      node.fx = node.x
      node.fy = node.y

      if (graphData?.nodes) {
        saveAllNodePositions(graphData.nodes)
      }
    },
    [saveAllNodePositions]
  )

  return {
    handleNodeClick,
    handleNodeRightClick,
    handleEdgeRightClick,
    handleEdgeClick,
    handleBackgroundClick,
    handleBackgroundRightClick,
    handleNodeDragEnd
  }
}

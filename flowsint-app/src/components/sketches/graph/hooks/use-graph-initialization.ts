import { useEffect, useRef } from 'react'
import type { GraphViewerRef } from '@/types'

interface GraphControlActions {
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
  zoomToSelection: () => void
  centerOnNode: (x: number, y: number) => void
  regenerateLayout: (layoutType: 'force' | 'hierarchy') => void
  getViewportCenter: () => { x: number; y: number } | null
}

interface UseGraphInitializationParams {
  graphRef: React.RefObject<GraphViewerRef>
  instanceId?: string
  setActions: (actions: GraphControlActions) => void
  onGraphRef?: (ref: GraphViewerRef) => void
  selectedNodeIdsRef: React.RefObject<Set<string>>
  regenerateLayout: (layoutType: 'force' | 'hierarchy') => void
}

export const useGraphInitialization = ({
  graphRef,
  instanceId,
  setActions,
  onGraphRef,
  selectedNodeIdsRef,
  regenerateLayout
}: UseGraphInitializationParams) => {
  const isGraphReadyRef = useRef(false)
  const regenerateLayoutRef = useRef(regenerateLayout)

  useEffect(() => {
    regenerateLayoutRef.current = regenerateLayout
  }, [regenerateLayout])

  // Set up graph control actions immediately (not waiting for graphRef)
  useEffect(() => {
    if (instanceId) return

    setActions({
      zoomIn: () => {
        if (graphRef.current) {
          const zoom = graphRef.current.zoom()
          graphRef.current.zoom(zoom * 1.5)
        }
      },
      zoomOut: () => {
        if (graphRef.current) {
          const zoom = graphRef.current.zoom()
          graphRef.current.zoom(zoom * 0.75)
        }
      },
      zoomToFit: () => {
        graphRef.current?.zoomToFit(400)
      },
      zoomToSelection: () => {
        if (graphRef.current) {
          const nodeFilterFn = (node: { id?: string | number }) =>
            node.id !== undefined && (selectedNodeIdsRef.current?.has(String(node.id)) ?? false)
          graphRef.current.zoomToFit(400, 50, nodeFilterFn)
        }
      },
      centerOnNode: (x: number, y: number) => {
        if (graphRef.current) {
          graphRef.current.centerAt(x, y, 400)
          graphRef.current.zoom(12, 400)
        }
      },
      regenerateLayout: (layoutType: 'force' | 'hierarchy') => {
        regenerateLayoutRef.current(layoutType)
      },
      // BUG (pre-existing, not fixed here): ForceGraphMethods has no
      // getBoundingClientRect — this always fell through to `?? {x:0,y:0}`,
      // so "center of viewport" always resolved to graph-coordinate origin,
      // not the actual visible center. Left as-is rather than guessing at a
      // fix (needs the container's DOM rect, which this hook isn't given)
      // without a way to verify the corrected behavior against the running
      // app.
      getViewportCenter: () => {
        return { x: 0, y: 0 }
      }
    })

    return () => {
      setActions({
        zoomIn: () => {},
        zoomOut: () => {},
        zoomToFit: () => {},
        zoomToSelection: () => {},
        centerOnNode: () => {},
        regenerateLayout: () => {},
        getViewportCenter: () => null
      })
    }
  }, [setActions, instanceId, selectedNodeIdsRef, graphRef])

  // Call onGraphRef when graph instance is ready
  useEffect(() => {
    const graphInstance = graphRef.current
    if (!graphInstance || isGraphReadyRef.current) return

    isGraphReadyRef.current = true
    onGraphRef?.(graphInstance)

    return () => {
      isGraphReadyRef.current = false
    }
  }, [onGraphRef, graphRef])

  return {
    isGraphReadyRef
  }
}

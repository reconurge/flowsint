import { useEffect, useRef, useCallback } from 'react'

interface UseGraphInitializationParams {
  graphRef: React.RefObject<any>
  instanceId?: string
  setActions: (actions: any) => void
  onGraphRef?: (ref: any) => void
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
        if (graphRef.current && typeof graphRef.current.zoom === 'function') {
          const zoom = graphRef.current.zoom()
          graphRef.current.zoom(zoom * 1.5)
        }
      },
      zoomOut: () => {
        if (graphRef.current && typeof graphRef.current.zoom === 'function') {
          const zoom = graphRef.current.zoom()
          graphRef.current.zoom(zoom * 0.75)
        }
      },
      zoomToFit: () => {
        if (graphRef.current && typeof graphRef.current.zoomToFit === 'function') {
          graphRef.current.zoomToFit(400)
        }
      },
      zoomToSelection: () => {
        if (graphRef.current && typeof graphRef.current.zoomToFit === 'function') {
          const nodeFilterFn = (node: any) => selectedNodeIdsRef.current?.has(node.id)
          graphRef.current.zoomToFit(400, 50, nodeFilterFn)
        }
      },
      centerOnNode: (x: number, y: number) => {
        if (graphRef.current && typeof graphRef.current.centerAt === 'function') {
          graphRef.current.centerAt(x, y, 400)
          if (typeof graphRef.current.zoom === 'function') {
            graphRef.current.zoom(12, 400)
          }
        }
      },
      regenerateLayout: (layoutType: 'force' | 'hierarchy') => {
        regenerateLayoutRef.current(layoutType)
      },
      getViewportCenter: () => {
        if (!graphRef.current) return null
        const rect = graphRef.current.getBoundingClientRect?.()
        if (!rect) return { x: 0, y: 0 }
        const screenCenterX = rect.width / 2
        const screenCenterY = rect.height / 2
        if (typeof graphRef.current.screen2GraphCoords === 'function') {
          return graphRef.current.screen2GraphCoords(screenCenterX, screenCenterY)
        }
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

    // Wait for graph methods to be available
    if (typeof graphInstance.zoom !== 'function' || typeof graphInstance.zoomToFit !== 'function') {
      return
    }

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

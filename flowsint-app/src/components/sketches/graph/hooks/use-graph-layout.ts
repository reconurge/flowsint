import { useState, useCallback } from 'react'
import { useLayout } from '@/hooks/use-layout'
import type { GraphNode, GraphViewerRef } from '@/types'
import type { GraphForceSettings } from '@/stores/graph-settings-store'
import type { GraphData } from '../utils/types'

interface UseGraphLayoutParams {
  forceSettings: GraphForceSettings
  containerSize: { width: number; height: number }
  saveAllNodePositions: (nodes: GraphNode[]) => void
  graphRef: React.RefObject<GraphViewerRef>
  graphData: GraphData
}

export const useGraphLayout = ({
  forceSettings,
  containerSize,
  saveAllNodePositions,
  graphRef,
  graphData
}: UseGraphLayoutParams) => {
  const [isRegeneratingLayout, setIsRegeneratingLayout] = useState(false)

  const { applyLayout } = useLayout({
    forceSettings,
    containerSize,
    saveAllNodePositions,
    onProgress: (progress) => {
      // Keep loading state active while worker is running
      if (progress < 100) {
        setIsRegeneratingLayout(true)
      }
    }
  })

  const regenerateLayout = useCallback(
    async (layoutType: 'force' | 'hierarchy') => {
      if (!graphRef.current || !graphData?.nodes) {
        console.warn('Cannot regenerate layout: graph not ready')
        return
      }

      setIsRegeneratingLayout(true)

      try {
        await applyLayout({
          layoutType,
          nodes: graphData.nodes,
          edges: graphData.links
        })

        // Wait a bit for positions to be applied, then zoom to fit
        setTimeout(() => {
          if (graphRef.current?.zoomToFit) {
            graphRef.current.zoomToFit(400)
          }
        }, 100)
      } catch (error) {
        console.error('Layout calculation failed:', error)
      } finally {
        // Keep overlay visible for smooth transition
        setTimeout(() => {
          setIsRegeneratingLayout(false)
        }, 600)
      }
    },
    [applyLayout, graphRef, graphData]
  )

  return {
    isRegeneratingLayout,
    regenerateLayout
  }
}

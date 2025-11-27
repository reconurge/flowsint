import { useEffect } from 'react'
import { useGraphControls } from '@/stores/graph-controls-store'
import { EventLevel } from '@/types'

const API_URL = import.meta.env.VITE_API_URL

/**
 * Dedicated hook for graph refresh on transform completion.
 *
 * This hook listens ONLY to COMPLETED events via SSE and triggers
 * a graph refetch followed by layout regeneration. It's completely
 * separate from the logging system (use-events.ts).
 *
 * Architecture:
 * - Transform completes → Logger.completed() → SSE event
 * - This hook receives COMPLETED event
 * - Calls refetchGraph() with callback
 * - Callback triggers regenerateLayout() with fresh data
 */
export function useGraphRefresh(sketch_id: string | undefined) {
  const refetchGraph = useGraphControls((s) => s.refetchGraph)
  const regenerateLayout = useGraphControls((s) => s.regenerateLayout)
  const currentLayoutType = useGraphControls((s) => s.currentLayoutType)

  useEffect(() => {
    if (!sketch_id) return

    console.log('[useGraphRefresh] Connecting to SSE for sketch:', sketch_id)
    const eventSource = new EventSource(
      `${API_URL}/api/events/sketch/${sketch_id}/stream`
    )

    eventSource.onopen = () => {
      console.log('[useGraphRefresh] SSE connection opened')
    }

    eventSource.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data) as any
        const event = JSON.parse(raw.data) as any
        console.log('[useGraphRefresh] Received event:', event.type, event)

        // Only handle COMPLETED events
        if (event.type === EventLevel.COMPLETED) {
          console.log('[useGraphRefresh] COMPLETED event detected, triggering refetch')
          console.log('[useGraphRefresh] refetchGraph function:', refetchGraph)
          console.log('[useGraphRefresh] currentLayoutType:', currentLayoutType)

          // Refetch graph data, then regenerate layout with fresh data
          refetchGraph(() => {
            console.log('[useGraphRefresh] Refetch callback executing, regenerating layout')
            if (currentLayoutType) {
              regenerateLayout(currentLayoutType)
            }
          })
        }
      } catch (error) {
        console.error('[useGraphRefresh] Failed to parse SSE event:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('[useGraphRefresh] EventSource error:', error)
      eventSource.close()
    }

    return () => {
      console.log('[useGraphRefresh] Disconnecting SSE')
      eventSource.close()
    }
  }, [sketch_id, refetchGraph, regenerateLayout, currentLayoutType])
}

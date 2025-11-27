import { useEffect, useRef } from 'react'
import { useGraphControls } from '@/stores/graph-controls-store'
import { EventLevel } from '@/types'

const API_URL = import.meta.env.VITE_API_URL

export function useGraphRefresh(sketch_id: string | undefined) {
  const refetchGraph = useGraphControls((s) => s.refetchGraph)
  const setShouldRegenerateLayoutOnNextRefetch = useGraphControls((s) => s.setShouldRegenerateLayoutOnNextRefetch)
  const currentLayoutType = useGraphControls((s) => s.currentLayoutType)

  // Use refs to avoid reconnecting SSE when functions change
  const refetchGraphRef = useRef(refetchGraph)
  const setShouldRegenerateRef = useRef(setShouldRegenerateLayoutOnNextRefetch)
  const currentLayoutTypeRef = useRef(currentLayoutType)

  // Keep refs updated
  useEffect(() => {
    refetchGraphRef.current = refetchGraph
    setShouldRegenerateRef.current = setShouldRegenerateLayoutOnNextRefetch
    currentLayoutTypeRef.current = currentLayoutType
  }, [refetchGraph, setShouldRegenerateLayoutOnNextRefetch, currentLayoutType])

  useEffect(() => {
    if (!sketch_id) return

    const eventSource = new EventSource(
      `${API_URL}/api/events/sketch/${sketch_id}/status/stream`
    )

    eventSource.onmessage = (e) => {
      try {
        // Handle malformed SSE data (connection message has extra "data: " prefix)
        let dataStr = e.data
        if (dataStr.startsWith('data: ')) {
          dataStr = dataStr.substring(6) // Remove "data: " prefix
        }

        const raw = JSON.parse(dataStr) as any

        // Ignore connection messages
        if (raw.event === 'connected') {
          return
        }

        // Only process status events
        if (raw.event !== 'status') {
          return
        }

        const event = JSON.parse(raw.data) as any

        // Only handle COMPLETED events
        if (event.type === EventLevel.COMPLETED) {
          const refetch = refetchGraphRef.current
          const setShouldRegenerate = setShouldRegenerateRef.current
          const layoutType = currentLayoutTypeRef.current

          if (typeof refetch !== 'function') {
            return
          }

          // Set flag to regenerate layout when new data arrives
          if (layoutType && typeof setShouldRegenerate === 'function') {
            setShouldRegenerate(true)
          }

          // Refetch graph data - the regeneration will happen automatically
          // via the useEffect in graph-viewer.tsx when nodes change
          refetch()
        }
      } catch (error) {
        console.error('[useGraphRefresh] Failed to parse SSE event:', error, e.data)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [sketch_id]) // Only reconnect when sketch_id changes
}

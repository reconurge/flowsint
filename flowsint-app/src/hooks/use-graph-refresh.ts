import { useEffect, useRef } from 'react'
import { useGraphControls } from '@/stores/graph-controls-store'
import { useAuthStore } from '@/stores/auth-store'
import { EventLevel } from '@/types'

const API_URL = import.meta.env.VITE_API_URL

export function useGraphRefresh(sketch_id: string | undefined) {
  const refetchGraph = useGraphControls((s) => s.refetchGraph)
  const regenerateLayout = useGraphControls((s) => s.regenerateLayout)
  const currentLayoutType = useGraphControls((s) => s.currentLayoutType)
  const token = useAuthStore((s) => s.token)

  // Use refs to avoid reconnecting SSE when functions change
  const refetchGraphRef = useRef(refetchGraph)
  const regenerateLayoutRef = useRef(regenerateLayout)
  const currentLayoutTypeRef = useRef(currentLayoutType)

  // Keep refs updated
  useEffect(() => {
    refetchGraphRef.current = refetchGraph
    regenerateLayoutRef.current = regenerateLayout
    currentLayoutTypeRef.current = currentLayoutType
  }, [refetchGraph, regenerateLayout, currentLayoutType])

  useEffect(() => {
    if (!sketch_id || !token) return
    const eventSource = new EventSource(
      `${API_URL}/api/events/sketch/${sketch_id}/status/stream?token=${token}`
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
          const regenerate = regenerateLayoutRef.current
          const layoutType = currentLayoutTypeRef.current

          if (typeof refetch !== 'function') {
            return
          }

          // Refetch graph data with callback to regenerate layout after
          refetch(() => {
            // After refetch completes, regenerate layout if we have one active
            if (layoutType && typeof regenerate === 'function') {
              regenerate(layoutType)
            }
          })
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
  }, [sketch_id, token]) // Only reconnect when sketch_id or token changes
}

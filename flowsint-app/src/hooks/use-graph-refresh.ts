import { useEffect, useRef } from 'react'
import { useGraphControls } from '@/stores/graph-controls-store'
import { useAuthStore } from '@/stores/auth-store'
import { EventLevel } from '@/types'
import { connectSSE } from '@/api/sse'

const API_URL = import.meta.env.VITE_API_URL ?? ''

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

    const dispose = connectSSE({
      url: `${API_URL}/api/events/sketch/${sketch_id}/status/stream`,
      onMessage: (raw) => {
        // Only process status events
        if (raw.event !== 'status') return
        try {
          const event = JSON.parse(raw.data as string) as any
          // Only handle COMPLETED events
          if (event.type === EventLevel.COMPLETED) {
            const refetch = refetchGraphRef.current
            const regenerate = regenerateLayoutRef.current
            const layoutType = currentLayoutTypeRef.current

            if (typeof refetch !== 'function') return

            // Refetch graph data, then regenerate layout if one is active
            refetch(() => {
              if (layoutType && typeof regenerate === 'function') {
                regenerate(layoutType)
              }
            })
          }
        } catch (error) {
          console.error('[useGraphRefresh] Failed to parse status payload:', error, raw.data)
        }
      },
    })

    return dispose
  }, [sketch_id, token])
}

import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { logService } from '@/api/log-service'
import { EventLevel } from '@/types'
import { useGraphControls } from '@/stores/graph-controls-store'
import { queryKeys } from '@/api/query-keys'

const API_URL = import.meta.env.VITE_API_URL


export function useEvents(sketch_id: string | undefined) {
  const [liveLogs, setLiveLogs] = useState<Event[]>([])
  const refetchGraph = useGraphControls((s) => s.refetchGraph)
  const setShouldRegenerateLayoutOnNextRefetch = useGraphControls((s) => s.setShouldRegenerateLayoutOnNextRefetch)

  const { data: previousLogs = [], refetch } = useQuery({
    queryKey: queryKeys.logs.bySketch(sketch_id as string),
    queryFn: () => logService.get(sketch_id as string),
    enabled: !!sketch_id,
  })

  const handleRefresh = () => {
    refetch()
    setLiveLogs([]) // Pour éviter les doublons dans les logs live
  }

  // Reset live logs when sketch_id changes
  useEffect(() => {
    setLiveLogs([])
  }, [sketch_id])

  useEffect(() => {
    if (!sketch_id) return

    const eventSource = new EventSource(
      `${API_URL}/api/events/sketch/${sketch_id}/stream`
    )

    eventSource.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data) as any
        const event = JSON.parse(raw.data) as Event
        if (event.type === EventLevel.COMPLETED) {
          // Set flag to regenerate layout after refetch completes
          setShouldRegenerateLayoutOnNextRefetch(true)
          refetchGraph()
        }
        setLiveLogs((prev) => [...prev.slice(-99), event])
      } catch (error) {
        console.error('[useSketchEvents] Failed to parse SSE event:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('[useSketchEvents] EventSource error:', error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [sketch_id, refetchGraph])

  const logs = useMemo(
    () => [...previousLogs, ...liveLogs].slice(-100),
    [previousLogs, liveLogs]
  )

  return {
    logs,
    // graphUpdates,
    refetch: handleRefresh
    // clearGraphUpdates: () => setGraphUpdates([]),
  }
}

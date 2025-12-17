import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { logService } from '@/api/log-service'
import { queryKeys } from '@/api/query-keys'
import { useAuthStore } from '@/stores/auth-store'

const API_URL = import.meta.env.VITE_API_URL


export function useEvents(sketch_id: string | undefined) {
  const [liveLogs, setLiveLogs] = useState<Event[]>([])
  const token = useAuthStore((s) => s.token)

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
    if (!sketch_id || !token) return

    const eventSource = new EventSource(
      `${API_URL}/api/events/sketch/${sketch_id}/stream?token=${token}`
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

        // Only process log events
        if (raw.event !== 'log') {
          return
        }

        const event = JSON.parse(raw.data) as Event
        setLiveLogs((prev) => [...prev.slice(-99), event])
      } catch (error) {
        console.error('[useSketchEvents] Failed to parse SSE event:', error, e.data)
      }
    }

    eventSource.onerror = (error) => {
      console.error('[useSketchEvents] EventSource error:', error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [sketch_id, token])

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

import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { logService } from '@/api/log-service'
import { queryKeys } from '@/api/query-keys'
import { useAuthStore } from '@/stores/auth-store'
import { connectSSE } from '@/api/sse'

const API_URL = import.meta.env.VITE_API_URL ?? ''


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

    const dispose = connectSSE({
      url: `${API_URL}/api/events/sketch/${sketch_id}/stream`,
      onMessage: (raw) => {
        // Only process log events
        if (raw.event !== 'log') return
        try {
          const event = JSON.parse(raw.data as string) as Event
          setLiveLogs((prev) => [...prev.slice(-99), event])
        } catch (error) {
          console.error('[useSketchEvents] Failed to parse log payload:', error, raw.data)
        }
      },
    })

    return dispose
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

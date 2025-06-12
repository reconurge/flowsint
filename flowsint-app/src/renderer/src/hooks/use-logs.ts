import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { logService } from "@/api/log-service"

export interface Log {
    id: string
    scan_id: string
    sketch_id: string | null
    type: "INFO" | "WARN" | "ERROR" | "SUCCESS" | "DEBUG"
    content: string
    created_at: string
}

export function useLogs(sketch_id: string | undefined) {
    const [realtimeLogs, setRealtimeLogs] = useState<Log[]>([])

    const { data: previousLogs = [], refetch } = useQuery({
        queryKey: ["logs", sketch_id],
        queryFn: () => logService.get(sketch_id as string),
        refetchOnWindowFocus: false,
        enabled: !!sketch_id,
        staleTime: 30_000, // Consider data fresh for 30 seconds
    })

    const handleRefresh = () => {
        refetch()
        setRealtimeLogs([]) // Clear realtime logs on refresh to avoid duplicates
    }

    useEffect(() => {
        const eventSource = new EventSource(`http://localhost:5001/api/logs/sketch/${sketch_id}/stream`)

        eventSource.onmessage = (event) => {
            try {
                let log = JSON.parse(event.data)
                log = JSON.parse(log["data"]) as Log
                const content = JSON.parse(log.content)
                console.log("[useLogs] Received log event:", log)
                log = {
                    content: content.details.message,
                    type: log.type,
                    created_at: content.timestamp,
                    id: log.id,
                    scan_id: "",
                    sketch_id: log.sketch_id,
                }
                setRealtimeLogs((prevLogs) => {
                    const newLogs = [...prevLogs.slice(-99), log]
                    return newLogs
                })
            }
            catch (error) {
                console.error("[useLogs] Failed to parse log event:", error)
            }
        }

        eventSource.onerror = (error) => {
            console.error("[useLogs] EventSource error:", error)
            eventSource.close()
        }

        return () => {
            console.log("[useLogs] Cleaning up SSE connection")
            eventSource.close()
        }
    }, [sketch_id])

    // Combine previous and realtime logs, keeping the most recent 100
    const logs = [...previousLogs, ...realtimeLogs].slice(-100)

    return {
        logs,
        refetch: handleRefresh
    }
} 
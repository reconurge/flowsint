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

export function useLogs() {
    const [realtimeLogs, setRealtimeLogs] = useState<Log[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    const { data: previousLogs = [], refetch } = useQuery({
        queryKey: ["logs"],
        queryFn: logService.get,
        refetchOnWindowFocus: false,
        staleTime: 30_000, // Consider data fresh for 30 seconds
    })

    useEffect(() => {
        console.log("[useLogs] Setting up SSE connection")
        const eventSource = new EventSource(`http://localhost:5001/api/logs/stream`)

        eventSource.onopen = () => {
            console.log("[useLogs] SSE connection opened")
        }

        eventSource.addEventListener("log", (event) => {
            console.log("[useLogs] Received log event:", event.data)
            try {
                const log = JSON.parse(event.data) as Log
                console.log("[useLogs] Parsed log:", log)
                setRealtimeLogs((prevLogs) => [...prevLogs.slice(-99), log])
                setUnreadCount((count) => count + 1)
            } catch (error) {
                console.error("[useLogs] Failed to parse log event:", error)
            }
        })

        eventSource.onerror = (error) => {
            console.error("[useLogs] EventSource error:", error)
            eventSource.close()
        }

        return () => {
            console.log("[useLogs] Cleaning up SSE connection")
            eventSource.close()
        }
    }, [])

    // Combine previous and realtime logs, keeping the most recent 100
    const logs = [...previousLogs, ...realtimeLogs].slice(-100)

    const resetUnreadCount = () => setUnreadCount(0)

    return {
        logs,
        unreadCount,
        resetUnreadCount,
        refetch
    }
} 
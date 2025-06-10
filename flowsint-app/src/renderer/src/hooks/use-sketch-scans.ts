import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { scanService } from "@/api/scan-service"
import { Scan } from "./use-scan-status"

export function useSketchScans(sketch_id: string | undefined) {
    const [realtimeScans, setRealtimeScans] = useState<Record<string, Scan>>({})

    const { data: scans, refetch } = useQuery({
        queryKey: ["sketch-scans", sketch_id],
        queryFn: () => scanService.getSketchScans(sketch_id as string),
        refetchOnWindowFocus: false,
        enabled: !!sketch_id,
        staleTime: 30_000, // Consider data fresh for 30 seconds
    })

    useEffect(() => {
        if (!sketch_id || !scans) return

        // Initialize realtime scans with current scan data
        const initialRealtimeScans: Record<string, Scan> = {}
        scans.forEach(scan => {
            initialRealtimeScans[scan.scan_id] = scan
        })
        setRealtimeScans(initialRealtimeScans)

        // Set up SSE connections for each scan
        const eventSources: EventSource[] = []

        scans.forEach(scan => {
            const eventSource = new EventSource(`http://localhost:5001/api/scans/${scan.scan_id}/status/stream`)

            eventSource.onmessage = (event) => {
                try {
                    const statusUpdate = JSON.parse(event.data)
                    console.log("[useSketchScans] Received status update:", statusUpdate)

                    // Update the specific scan in our realtime state
                    setRealtimeScans(prev => {
                        const updated = { ...prev }
                        if (statusUpdate.event === 'status_update') {
                            updated[scan.scan_id] = {
                                ...updated[scan.scan_id],
                                ...statusUpdate.data
                            }

                            // Check if scan just completed
                            if (statusUpdate.data.status === 'completed') {
                                alert(`Refreshing ${sketch_id}`)
                            }
                        }
                        return updated
                    })
                } catch (error) {
                    console.error("[useSketchScans] Failed to parse status update:", error)
                }
            }

            eventSource.onerror = (error) => {
                console.error("[useSketchScans] EventSource error:", error)
                eventSource.close()
            }

            eventSources.push(eventSource)
        })

        return () => {
            console.log("[useSketchScans] Cleaning up SSE connections")
            eventSources.forEach(es => es.close())
        }
    }, [sketch_id, scans])

    // Combine realtime updates with the base scan data
    const currentScans = scans?.map(scan => realtimeScans[scan.scan_id] || scan) || []

    return {
        scans: currentScans,
        refetch
    }
} 
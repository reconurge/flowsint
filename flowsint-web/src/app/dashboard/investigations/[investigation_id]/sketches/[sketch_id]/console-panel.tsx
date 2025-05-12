"use client"

import { CopyButton } from "@/components/copy"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/use-confirm-dialog"
import { supabase } from "@/lib/supabase/client"
import { TrashIcon } from "lucide-react"
import { useParams } from "next/navigation"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type LogEntry = {
    id?: string
    type: "INFO" | "WARNING" | "ERROR" | "SUCCESS"
    timestamp: string
    content: string
    created_at?: string
}

const typeToClass: Record<string, string> = {
    INFO: "text-foreground",
    WARNING: "text-amber-500",
    ERROR: "text-destructive",
    SUCCESS: "text-green-500",
}

export const ConsolePanel = memo(function ConsolePanel() {
    const [logEntries, setLogEntries] = useState<LogEntry[]>([])
    const { sketch_id } = useParams()
    const bottomRef = useRef<HTMLDivElement | null>(null)
    const { confirm } = useConfirm()

    const refetch = useCallback(async () => {
        const { data, error } = await supabase
            .from("logs")
            .select("*")
            .eq("sketch_id", sketch_id)
            .order("created_at", { ascending: true })
            .limit(50)
        if (error) {
            console.error("Error fetching logs:", error)
            return
        }
        if (data) {
            const formattedLogs = data.map((log: any) => ({
                id: log.id,
                type: log.type || "INFO",
                timestamp: new Date(log.created_at).toLocaleTimeString(),
                content: log.content,
                created_at: log.created_at,
            }))
            setLogEntries(formattedLogs)
        }
    }, [sketch_id])

    const handleDeleteLogs = useCallback(async () => {
        try {
            const confirmed = await confirm({
                title: "Deleting logs",
                message: "Are you sure you want to delete these logs ?",
            })

            if (!confirmed) return

            const { error } = await supabase
                .from("logs")
                .delete()
                .eq("sketch_id", sketch_id)

            if (error) {
                toast.error("An error occurred deleting the logs.")
                return
            }

            toast.success("Logs cleared.")
            refetch()
        } catch (e) {
            toast.error("An error occurred deleting the logs.")
        }
    }, [confirm, sketch_id, refetch])

    useEffect(() => {
        refetch()

        const subscription = supabase
            .channel("logs-channel")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "logs",
                    filter: `sketch_id=eq.${sketch_id}`,
                },
                (payload) => {
                    const newLog = payload.new as any
                    const formattedLog: LogEntry = {
                        id: newLog.id,
                        type: newLog.type || "INFO",
                        timestamp: new Date(newLog.created_at).toLocaleTimeString(),
                        content: newLog.content,
                        created_at: newLog.created_at,
                    }
                    setLogEntries((prevLogs) => [...prevLogs, formattedLog])
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [refetch])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [logEntries])

    return (
        <div className="flex grow flex-col h-full">
            <div className="flex h-8 items-center bg-card py-2 justify-between border-b pl-4 pr-2">
                <h2 className="font-medium text-sm">Console</h2>
                <div className="flex items-center gap-1">
                    <CopyButton content={JSON.stringify(logEntries)} />
                    <Button
                        disabled={!logEntries.length}
                        onClick={handleDeleteLogs}
                        className="h-7 w-7"
                        variant="ghost"
                        size="icon"
                    >
                        <TrashIcon className="!h-3.5 !w-3.5 opacity-50" />
                    </Button>
                </div>
            </div>
            <div className="p-2 font-mono text-xs bg-card grow overflow-auto inset-shadow-sm">
                {logEntries.length > 0 ? (
                    <>
                        {logEntries.map((entry, index) => (
                            <div key={entry.id || index} className="mb-1 flex">
                                <span className="mr-2 text-primary font-bold">[{entry.timestamp}]</span>
                                <span className={typeToClass[entry.type] || ""}>
                                    {entry.content}
                                </span>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </>
                ) : (
                    <div className="text-muted-foreground italic">No logs available</div>
                )}
            </div>
        </div>
    )
})

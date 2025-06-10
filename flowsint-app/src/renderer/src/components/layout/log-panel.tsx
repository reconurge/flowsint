import { ScrollArea } from "../ui/scroll-area"
import { useLogs } from "@/hooks/use-logs"
import { Button } from "../ui/button"
import { logService } from "@/api/log-service"
import { useConfirm } from "../use-confirm-dialog"
import { useParams } from "@tanstack/react-router"
import { RefreshCcwIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import { CopyButton } from "../copy"

export function LogPanel() {
    const { id: sketch_id } = useParams({ strict: false })
    const { logs, refetch } = useLogs(sketch_id)
    const { confirm } = useConfirm()
    const bottomRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [logs])


    const handleDeleteLogs = async () => {
        if (!sketch_id) return
        if (!await confirm({
            title: "Delete all logs",
            message: "Are you sure you want to delete all logs?",
        })) return
        await logService.delete(sketch_id)
        refetch()
    }

    return (
        <div className="h-full bg-card border rounded-md relative">
            <ScrollArea className="h-full">
                <div className="p-4 font-mono text-sm leading-relaxed">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className={`flex items-start gap-2 mb-1 ${log.type === "ERROR"
                                ? "text-destructive"
                                : log.type === "WARN"
                                    ? "text-yellow-500"
                                    : log.type === "SUCCESS"
                                        ? "text-green-500"
                                        : "text-foreground"
                                }`}
                        >
                            <span className="text-muted-foreground min-w-[60px]">
                                {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                            <span className="flex-1">{log.content}</span>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                            No logs to display
                        </div>
                    )}
                </div>
                <div ref={bottomRef} />
            </ScrollArea>

            <div className="absolute top-2 right-2 flex gap-2">
                <CopyButton content={JSON.stringify(logs)} />
                <Button variant={"ghost"} size={"sm"} onClick={() => refetch()} className="text-muted-foreground hover:text-foreground">
                    <RefreshCcwIcon className="w-4 h-4" />
                </Button>
                <Button variant={"ghost"} size={"sm"} onClick={handleDeleteLogs} className="text-muted-foreground hover:text-foreground">
                    Clear
                </Button>
            </div>
        </div>
    )
}
import { ScrollArea } from "../ui/scroll-area"
import { useLogs } from "@/hooks/use-logs"
import { Button } from "../ui/button"
import { logService } from "@/api/log-service"
import { useConfirm } from "../use-confirm-dialog"

export function LogPanel() {
    const { logs, refetch } = useLogs()
    const { confirm } = useConfirm()

    const handleDeleteLogs = async () => {
        if (!await confirm({
            title: "Delete all logs",
            message: "Are you sure you want to delete all logs?",
        })) return
        await logService.delete()
        refetch()
    }

    return (
        <div className="h-full bg-background relative">
            <ScrollArea className="h-full">
                <div className="space-y-1 p-2 font-mono text-xs">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className={`flex items-start gap-2 ${log.type === "ERROR"
                                ? "text-red-500"
                                : log.type === "WARN"
                                    ? "text-yellow-500"
                                    : log.type === "SUCCESS"
                                        ? "text-green-500"
                                        : "text-muted-foreground"
                                }`}
                        >
                            <span className="opacity-50">
                                {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                            <span>{log.content}</span>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                            No logs to display
                        </div>
                    )}
                </div>
            </ScrollArea>
            <Button variant={"outline"} size={"sm"} className="absolute top-2 right-2 h-7" onClick={handleDeleteLogs}>Delete all logs</Button>
        </div>
    )
} 
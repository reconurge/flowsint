import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, Database, FileText, Grid, List } from 'lucide-react'
import { memo } from 'react'

export const ConsolePanel = memo(function ConsolePanel() {
    // Sample log entries for the console panel
    const logEntries = [
        { type: "info", timestamp: "14:32:15", message: 'Loading graph "Investigation 1"' },
        { type: "info", timestamp: "14:32:16", message: "Graph loaded successfully" },
        { type: "action", timestamp: "14:33:05", message: "Running transform: Email to Domain" },
        { type: "info", timestamp: "14:33:07", message: "Transform completed: 1 entity added" },
        { type: "warning", timestamp: "14:33:10", message: "Rate limit approaching for API: hunter.io" },
        { type: "error", timestamp: "14:34:22", message: "Transform failed: API key invalid" },
        { type: "info", timestamp: "14:35:01", message: "Entity added: IP Address 192.168.1.1" },
    ]

    return (
        <div className="flex grow flex-col h-full">
            <div className="flex h-8 items-center bg-card py-2 justify-between border-b px-4">
                <h2 className="font-medium text-sm">Console</h2>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Grid className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <List className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Database className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="p-2 font-mono text-xs bg-card grow overflow-auto inset-shadow-sm">
                {logEntries.map((entry, index) => (
                    <div key={index} className="mb-1 flex">
                        <span className="mr-2 text-muted-foreground">[{entry.timestamp}]</span>
                        <span
                            className={
                                entry.type === "error"
                                    ? "text-destructive"
                                    : entry.type === "warning"
                                        ? "text-amber-500"
                                        : entry.type === "action"
                                            ? "text-primary"
                                            : "text-foreground"
                            }
                        >
                            {entry.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
})
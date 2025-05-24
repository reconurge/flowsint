import { Link, useParams } from '@tanstack/react-router'
import { useTabEditorStore } from "@/store/tab-editor-store"
import { Waypoints, X } from "lucide-react"
import { Badge } from "../ui/badge"
import { cn } from "@/lib/utils"

export function GraphTabs() {
    const tabs = useTabEditorStore((s) => s.tabs)
    const closeTab = useTabEditorStore((s) => s.closeTab)
    const { id, type, investigationId } = useParams({ strict: false })

    return (
        <div className="flex bg-background w-full h-10 border-b overflow-x-auto">
            {tabs.map((tab) => (
                <Link
                    key={`${tab.investigationId}-${tab.type}-${tab.id}`}
                    to="/dashboard/investigations/$investigationId/$type/$id"
                    params={{
                        investigationId: tab.investigationId,
                        type: tab.type,
                        id: tab.id,
                    }}
                    className={cn(
                        "group flex items-center text-muted-foreground h-full px-3 text-sm border-b-2 border-b-transparent border-r cursor-pointer",
                        id === tab.id &&
                        type === tab.type &&
                        investigationId === tab.investigationId &&
                        "border-b-primary text-foreground",
                        id !== tab.id && "hover:text-foreground"
                    )}
                >
                    <span className="truncate flex items-center gap-1 max-w-40">
                        <Badge variant="outline" className="text-[.5rem] p-1 !py-.5 text-yellow-500 border-none">
                            <Waypoints className="h-3 w-3" />
                        </Badge>
                        {tab.title}
                        {tab.isDirty && " •"}
                    </span>
                    <button
                        className="ml-2 opacity-50 group-hover:opacity-100 hover:bg-[#3c3c3c] rounded p-0.5"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            closeTab(tab.id)
                        }}
                    >
                        <X size={14} />
                    </button>
                </Link>
            ))}
        </div>
    )
}

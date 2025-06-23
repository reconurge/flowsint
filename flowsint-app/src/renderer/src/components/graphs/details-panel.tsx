"use client"
import { memo } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy"
import { Button } from "@/components/ui/button"
import { Edit, Edit2 } from "lucide-react"
import LaunchTransform from "./launch-transform"
import { useGraphStore } from "@/stores/graph-store"

export default function DetailsPanel({ data }: { data: any }) {
    const setOpenNodeEditorModal = useGraphStore(state => state.setOpenNodeEditorModal)
    const handleEdit = () => {
        setOpenNodeEditorModal(true)

    }

    return (
        <div className="overflow-y-auto overflow-x-hidden w-full min-w-0 h-full min-h-0">
            <div className="flex items-center sticky w-full bg-card top-0 border-b justify-start px-4 py-2 gap-2 z-50">
                <h1 className="text-md font-semibold truncate">{data?.label}</h1>
                <div className="grow" />
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleEdit}
                        className="h-7 w-7 p-0"
                    >
                        <Edit2 strokeWidth={1.5} className="!h-4 !w-4 opacity-60" />
                    </Button>
                    <LaunchTransform values={[data.label]} type={data?.type} />
                </div>
            </div>
            <KeyValueDisplay data={data} />
        </div>
    )
}

interface KeyValueDisplayProps {
    data: Record<string, any>
    className?: string
}

function KeyValueDisplay({ data, className }: KeyValueDisplayProps) {
    return (
        <div className={cn("w-full border-collapse", className)}>
            {data && Object.entries(data)
                .filter(([key]) => !["sketch_id", "caption", "size", "color"].includes(key))
                .map(([key, value], index) => {
                    const val = Array.isArray(value) ? `${value.length} items` : value?.toString() || null
                    const display = (typeof val === "string" && val.startsWith("https://"))
                        ? <a href={val} className="underline text-primary truncate" target="_blank" rel="noopener noreferrer">{val}</a>
                        : val
                    return (
                        <div
                            key={index}
                            className="flex w-full bg-card items-center divide-x divide-border border-b border-border p-0"
                        >
                            <div className="w-1/2 px-4 p-2 text-sm text-muted-foreground font-normal truncate">{key}</div>
                            <div className="w-1/2 px-4 p-2 text-sm font-medium flex items-center justify-between min-w-0">
                                <div className="truncate font-semibold">{display || <span className="italic text-muted-foreground">N/A</span>}</div>
                                {display && <CopyButton className="h-6 w-6 shrink-0" content={val} />}
                            </div>
                        </div>
                    )
                })}
        </div>
    )
}

export const MemoizedKeyValueDisplay = memo(KeyValueDisplay)

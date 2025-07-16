import { memo } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy"
import { Check, Rocket, X } from "lucide-react"
import LaunchTransform from "./launch-transform"
import NodeActions from "./node-actions"
import { GraphNode } from "@/stores/graph-store"
import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"

export default function DetailsPanel({ node }: { node: GraphNode }) {

    return (
        <div className="overflow-y-auto overflow-x-hidden w-full min-w-0 h-full min-h-0">
            <div className="flex items-center sticky w-full bg-card top-0 border-b justify-start px-4 py-2 gap-2 z-50">
                <h1 className="text-md font-semibold truncate">{node.data?.label}</h1>
                <div className="grow" />
                <div className="flex items-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <LaunchTransform values={[node.data.label]} type={node.data?.type}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100"
                                        >
                                            <Rocket className="h-3 w-3" strokeWidth={2} />
                                        </Button>
                                    </LaunchTransform>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Launch transform</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <NodeActions node={node} />
                </div>
            </div>
            {node.data?.description && (
                <div className="px-4 py-3 border-b border-border">
                    <div
                        className="text-sm text-muted-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: node.data.description }}
                    />
                </div>
            )}
            <KeyValueDisplay data={node.data} />
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
                .filter(([key]) => !["sketch_id", "caption", "size", "color", "description"].includes(key))
                .map(([key, value], index) => {
                    let val: string | null = null
                    let display: React.ReactNode = null

                    if (typeof value === "boolean") {
                        val = value.toString()
                        display = value ? (
                            <Check className="h-4 w-4 text-green-600" />
                        ) : (
                            <X className="h-4 w-4 text-red-600" />
                        )
                    } else if (Array.isArray(value)) {
                        val = `${value.length} items`
                        display = val
                    } else {
                        val = value?.toString() || null
                        display = (typeof val === "string" && val.startsWith("https://"))
                            ? <a href={val} className="underline text-primary truncate" target="_blank" rel="noopener noreferrer">{val}</a>
                            : val
                    }

                    return (
                        <div
                            key={index}
                            className="flex w-full bg-card items-center divide-x divide-border border-b border-border p-0"
                        >
                            <div className="w-1/2 px-4 p-2 text-sm text-muted-foreground font-normal truncate">{key}</div>
                            <div className="w-1/2 px-4 p-2 text-sm font-medium flex items-center justify-between min-w-0">
                                <div className="truncate font-semibold">{display || <span className="italic text-muted-foreground">N/A</span>}</div>
                                {display && val && typeof value !== "boolean" && <CopyButton className="h-6 w-6 shrink-0" content={val} />}
                            </div>
                        </div>
                    )
                })}
        </div>
    )
}

export const MemoizedKeyValueDisplay = memo(KeyValueDisplay)

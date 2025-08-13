import { memo } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy"
import { Check, Rocket, X, MousePointer } from "lucide-react"
import LaunchTransform from "../launch-transform"
import NodeActions from "../node-actions"
import { GraphNode } from "@/stores/graph-store"
import { Button } from "../../ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/tooltip"
import { useIcon } from "@/hooks/use-icon"
import { useParams } from "@tanstack/react-router"
import NeighborsGraph from "./neighbors"
import Relationships from "./relationships"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../../ui/resizable"

export default function DetailsPanel({ node }: { node: GraphNode | null }) {
    const { id: sketchId } = useParams({ strict: false })
    if (!node) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <MousePointer className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Node Selected
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                    Click on any node in the graph to view its details and properties
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-card">
            <ItemHero node={node} />
            <div className="flex items-center bg-card sticky w-full top-0 border-b justify-start px-4 py-2 gap-2 z-1">
                <p className="text-md font-semibold truncate">{node.data?.label}</p>
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
            <div className="flex-1 min-h-0">
                <ResizablePanelGroup direction="vertical" className="h-full">
                    <ResizablePanel defaultSize={20} minSize={20}>
                        <div className="h-full overflow-auto">
                            <KeyValueDisplay data={node.data} />
                        </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={35} minSize={25}>
                        <div className="h-full p-3">
                            <NeighborsGraph sketchId={sketchId as string} nodeId={node.id} />
                        </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={45} minSize={20}>
                        <Relationships sketchId={sketchId as string} nodeId={node.id} />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
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

const ItemHero = ({ node }: { node: GraphNode }) => {
    const ItemIcon = useIcon(node.data.type, node.data.src)
    return (
        <div className="flex bg-card border-b items-center w-full justify-between p-4 gap-4">
            <div className="truncate">
                <p className="text-xl font-semibold truncate text-ellipsis">{node.data.label}</p>
                <p className="text-sm font-normal opacity-60 truncate text-ellipsis">{node.data.type}</p>
            </div>
            <ItemIcon size={50} />
        </div>
    )
}
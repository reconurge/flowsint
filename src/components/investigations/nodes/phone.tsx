"use client"

import { memo } from "react"
import { Handle, Position, useStore } from "@xyflow/react"
import { NodeProvider, useNodeContext } from "@/components/contexts/node-context"
import { PhoneIcon, Zap } from "lucide-react"
import { cn, zoomSelector } from "@/lib/utils"
import { useInvestigationStore } from "@/store/investigation-store"
import { CopyButton } from "@/components/copy"
import { useSearchContext } from "@/components/contexts/search-context"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useFlowStore } from "@/store/flow-store"

function PhoneNode({ data }: any) {
    const { handleDeleteNode, loading } = useNodeContext()
    const { settings } = useInvestigationStore()
    const { currentNode } = useFlowStore()
    const { handleOpenSearchModal } = useSearchContext()
    const showContent = useStore(zoomSelector)

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div className={cn(loading ? "opacity-40" : "opacity-100")}>
                    {settings.showNodeLabel && showContent ? (
                        <Card
                            className={cn(
                                "border hover:border-primary rounded-full p-0 shadow-none backdrop-blur bg-background/40",
                                currentNode === data.id && "border-primary",
                            )}
                        >
                            <div className="flex items-center gap-2 p-1">
                                <Badge variant="secondary" className="h-6 w-6 p-0 rounded-full">
                                    <PhoneIcon className="h-4 w-4" />
                                </Badge>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm">{data.label}</span>
                                    {settings.showCopyIcon && <CopyButton className="rounded-full h-7 w-7 text-xs" content={data.label} />}
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" className="rounded-full p-0">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback>
                                                <PhoneIcon className="h-3 w-3" />
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{data.label}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    <Handle
                        type="target"
                        position={Position.Top}
                        className={cn("w-16 bg-teal-500 hidden", settings.floatingEdges && "hidden")}
                    />
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={() => handleOpenSearchModal(data.phone_number)}>
                    Launch search
                    <Zap className="ml-2 h-4 w-4 text-orange-500" />
                </ContextMenuItem>
                <ContextMenuItem>
                    Copy content
                    <span className="ml-auto text-xs text-muted-foreground">⌘ C</span>
                </ContextMenuItem>
                <ContextMenuItem>
                    Duplicate
                    <span className="ml-auto text-xs text-muted-foreground">⌘ D</span>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleDeleteNode} className="text-red-600">
                    Delete
                    <span className="ml-auto text-xs text-muted-foreground">⌘ ⌫</span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

const MemoizedNode = (props: any) => (
    <NodeProvider>
        <PhoneNode {...props} />
    </NodeProvider>
)

export default memo(MemoizedNode)


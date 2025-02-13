"use client"

import { memo } from "react"
import { Handle, Position, useStore } from "@xyflow/react"
import { NodeProvider, useNodeContext } from "@/components/contexts/node-context"
import { MapPinHouseIcon, Zap } from "lucide-react"
import { cn, zoomSelector } from "@/lib/utils"
import { useInvestigationContext } from "@/components/contexts/investigation-provider"
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

function EmailNode({ data }: any) {
    const { handleDeleteNode, loading } = useNodeContext()
    const { settings, currentNode } = useInvestigationContext()
    const { handleOpenSearchModal } = useSearchContext()
    const showContent = useStore(zoomSelector)

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div className={cn(loading ? "opacity-40" : "opacity-100")}>
                    {settings.showNodeLabel && showContent ? (
                        <Card
                            className={cn(
                                "pr-4 border border-transparent hover:border-sky-400 rounded-full",
                                currentNode === data.id && "border-sky-400",
                            )}
                        >
                            <div className="flex items-center">
                                <Badge variant="secondary" className="h-6 rounded-r-none">
                                    <MapPinHouseIcon className="h-3 w-3" />
                                </Badge>
                                <div className="flex items-center p-1 px-1.5 gap-2">
                                    <span className="text-sm">{data.label}</span>
                                    {settings.showCopyIcon && <CopyButton content={data.label} />}
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
                                                <MapPinHouseIcon className="h-3 w-3" />
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
                <ContextMenuItem onClick={() => handleOpenSearchModal(data.email)}>
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
        <EmailNode {...props} />
    </NodeProvider>
)

export default memo(MemoizedNode)


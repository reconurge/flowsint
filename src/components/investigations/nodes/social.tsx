"use client"

import { memo } from "react"
import { Handle, Position, useStore } from "@xyflow/react"
import { NodeProvider, useNodeContext } from "@/components/contexts/node-context"
import { cn, zoomSelector } from "@/lib/utils"
import { useInvestigationContext } from "@/components/contexts/investigation-provider"
import { usePlatformIcons } from "@/lib/hooks/use-platform-icons"
import { CopyButton } from "@/components/copy"
import { useSearchContext } from "@/components/contexts/search-context"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Zap } from "lucide-react"

function Custom({ data }: any) {
    const { handleDeleteNode, loading } = useNodeContext()
    const { settings, currentNode } = useInvestigationContext()
    const platformsIcons = usePlatformIcons()
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
                                <Badge
                                    variant="secondary"
                                    /* @ts-ignore */
                                    className={cn("h-6 rounded-r-none", `bg-${platformsIcons?.[data?.platform]?.color}-100`)}
                                >
                                    {/* @ts-ignore */}
                                    {platformsIcons?.[data?.platform]?.icon || "?"}
                                </Badge>
                                <div className="flex items-center p-1 px-1.5 gap-2">
                                    <span className="text-sm">{data.username || data.profile_url}</span>
                                    {settings.showCopyIcon && <CopyButton content={data.username || data.profile_url} />}
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" className="p-0 h-auto">
                                        {/* @ts-ignore */}
                                        <Avatar className={cn("h-6 w-6", `bg-${platformsIcons?.[data?.platform]?.color}-100`)}>
                                            <AvatarImage src={data?.image_url} alt={data.username || data.profile_url} />
                                            {/* @ts-ignore */}
                                            <AvatarFallback>{platformsIcons?.[data?.platform]?.icon || "?"}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{data.username || data.profile_url}</TooltipContent>
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
                <ContextMenuItem onClick={() => handleOpenSearchModal(data.username || data.profile_url)}>
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

const SocialNode = (props: any) => (
    <NodeProvider>
        <Custom {...props} />
    </NodeProvider>
)

export default memo(SocialNode)


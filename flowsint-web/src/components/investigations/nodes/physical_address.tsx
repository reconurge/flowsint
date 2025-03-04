"use client"

import { memo, useCallback, useMemo } from "react"
import { Handle, Position, useStore } from "@xyflow/react"
import { NodeProvider, useNodeContext } from "@/components/contexts/node-context"
import { LocateIcon, Zap } from "lucide-react"
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

function AddressNode({ data }: any) {
    const { handleDeleteNode, loading } = useNodeContext()
    const { settings } = useInvestigationStore()
    const { currentNode } = useFlowStore()
    const { handleOpenSearchModal } = useSearchContext()
    const showContent = useStore(zoomSelector, (a, b) => a === b)
    const handleDelete = useCallback(() => handleDeleteNode(data.type), [data.type, handleDeleteNode])
    const handleSearch = useCallback(() => handleOpenSearchModal(data.label), [data.label, handleOpenSearchModal])

    const nodeContent = useMemo(() => {
        return (
            <Card
                className={cn(
                    "border hover:border-primary rounded-full p-0 shadow-none backdrop-blur bg-background/40",
                    currentNode === data.id && "border-primary",
                )}
            >
                <div className="flex items-center gap-2 p-1">
                    <Badge variant="secondary" className="h-6 w-6 p-0 rounded-full">
                        <LocateIcon className="h-4 w-4" />
                    </Badge>
                    <div className="flex items-center gap-1">
                        <span className="text-sm">{data.label}</span>
                        {settings.showCopyIcon && <CopyButton className="rounded-full h-7 w-7 text-xs" content={data.label} />}
                    </div>
                </div>
            </Card>
        )
    }, [currentNode, data.id, data.label, settings.showCopyIcon])

    const handle = useMemo(
        () => <Handle type="target" position={Position.Top} className={cn("w-16 bg-teal-500")} />,
        [],
    )
    const contextMenu = useMemo(
        () => (
            <ContextMenuContent>
                <ContextMenuItem onClick={handleSearch}>
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
                <ContextMenuItem onClick={handleDelete} className="text-red-600">
                    Delete
                    <span className="ml-auto text-xs text-muted-foreground">⌘ ⌫</span>
                </ContextMenuItem>
            </ContextMenuContent>
        ),
        [handleSearch, handleDelete],
    )

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div className={cn(loading ? "opacity-40" : "opacity-100")}>
                    {nodeContent}
                    {handle}
                </div>
            </ContextMenuTrigger>
            {contextMenu}
        </ContextMenu>
    )
}
const MemoizedNode = memo(
    (props: any) => (
        <NodeProvider>
            <AddressNode {...props} />
        </NodeProvider>
    ),
    (prevProps, nextProps) => {
        return (
            prevProps.id === nextProps.id &&
            prevProps.data.label === nextProps.data.label &&
            prevProps.selected === nextProps.selected
        )
    },
)

export default MemoizedNode


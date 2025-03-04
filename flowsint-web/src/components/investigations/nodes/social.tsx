"use client"

import { memo, useCallback, useMemo } from "react"
import { Handle, Position, useStore } from "@xyflow/react"
import { NodeProvider, useNodeContext } from "@/components/contexts/node-context"
import { MapPinIcon, Zap } from "lucide-react"
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
import { usePlatformIcons } from "@/lib/hooks/use-platform-icons"
import { useFlowStore } from "@/store/flow-store"

function SocialNode({ data }: any) {
    const { handleDeleteNode, loading } = useNodeContext()
    const { settings } = useInvestigationStore()
    const { currentNode } = useFlowStore()
    const platformsIcons = usePlatformIcons()
    const { handleOpenSearchModal } = useSearchContext()
    // Optimisation avec fonction d'égalité pour éviter les re-rendus inutiles
    const showContent = useStore(zoomSelector, (a, b) => a === b)

    // Callbacks mémorisés
    const handleDelete = useCallback(() => handleDeleteNode(data.type), [data.type, handleDeleteNode])
    const handleSearch = useCallback(() => handleOpenSearchModal(data.label), [data.label, handleOpenSearchModal])

    // Mémorisation de l'icône de la plateforme
    const platformIcon = useMemo(() => {
        // @ts-ignore
        return platformsIcons?.[data?.platform]?.icon
    }, [platformsIcons, data?.platform])

    // Mémorisation du contenu du nœud
    const nodeContent = useMemo(() => {
        if (settings.showNodeLabel && showContent) {
            return (
                <Card
                    className={cn(
                        "border hover:border-primary rounded-full p-0 shadow-none backdrop-blur bg-background/40",
                        currentNode === data.id && "border-primary",
                    )}
                >
                    <div className="flex items-center gap-2 p-1">
                        <Badge variant="secondary" className="h-6 w-6 p-0 rounded-full">
                            {platformIcon}
                        </Badge>
                        <div className="flex items-center gap-1">
                            <span className="text-sm">{data.username || data.profile_url}</span>
                            {settings.showCopyIcon && (
                                <CopyButton className="rounded-full h-7 w-7 text-xs" content={data.username || data.profile_url} />
                            )}
                        </div>
                    </div>
                </Card>
            )
        }

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" className="rounded-full p-0">
                            <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                    <MapPinIcon className="h-3 w-3" />
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{data.label}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }, [
        settings.showNodeLabel,
        showContent,
        currentNode,
        data.id,
        data.username,
        data.profile_url,
        data.label,
        settings.showCopyIcon,
        platformIcon,
    ])

    // Mémorisation de la poignée
    const handle = useMemo(
        () => <Handle type="target" position={Position.Top} className={cn("w-16 bg-teal-500")} />,
        [],
    )

    // Mémorisation du menu contextuel
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

// Composant enveloppé avec une fonction de comparaison personnalisée
const MemoizedNode = memo(
    (props: any) => (
        <NodeProvider>
            <SocialNode {...props} />
        </NodeProvider>
    ),
    (prevProps, nextProps) => {
        // Ne re-rendre que si les données importantes ont changé
        return (
            prevProps.id === nextProps.id &&
            prevProps.data.username === nextProps.data.username &&
            prevProps.data.profile_url === nextProps.data.profile_url &&
            prevProps.data.platform === nextProps.data.platform &&
            prevProps.selected === nextProps.selected
        )
    },
)

export default MemoizedNode


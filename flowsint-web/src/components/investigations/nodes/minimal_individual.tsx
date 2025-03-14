"use client"

import { memo, useMemo, useCallback } from "react"
// @ts-ignore
import { Handle, NodeToolbar, Position, useStore } from "@xyflow/react"
import { useInvestigationStore } from "@/store/investigation-store"
import { NodeProvider, useNodeContext } from "@/components/contexts/node-context"
import { useSearchContext } from "@/components/contexts/search-context"
import { cn, zoomSelector } from "@/lib/utils"
import { CopyButton } from "@/components/copy"
import { useChatContext } from "@/components/contexts/chatbot-context"
import { AtSign, Camera, Facebook, GithubIcon, Instagram, Locate, MapPin, MessageCircleDashed, Send, SquarePenIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit, Phone, User, Zap } from "lucide-react"
import { useFlowStore } from "@/store/flow-store"
import { useQueryState } from "nuqs"

// Composant optimisé pour les performances
function Custom(props: any) {
    const { settings } = useInvestigationStore()
    const { currentNode } = useFlowStore()
    const { setOpenAddNodeModal, handleDuplicateNode, setOpenNote, handleDeleteNode, loading } = useNodeContext()
    const { handleOpenSearchModal } = useSearchContext()
    const { handleOpenChat } = useChatContext()
    // Utilisation d'un sélecteur d'égalité pour éviter les re-rendus inutiles
    const showContent = useStore(zoomSelector, (a, b) => a === b)
    const [_, setIndividualId] = useQueryState("individual_id")
    const { data } = props

    // Callbacks mémorisés pour éviter les recréations de fonctions
    const handleEditClick = useCallback(() => setIndividualId(data.id), [data.id, setIndividualId])
    const handleChatClick = useCallback(() => handleOpenChat(data), [data, handleOpenChat])
    const handleSearchClick = useCallback(
        () => handleOpenSearchModal(data.full_name),
        [data.full_name, handleOpenSearchModal],
    )
    const handleDuplicateClick = useCallback(() => handleDuplicateNode(), [handleDuplicateNode])
    const handleDeleteClick = useCallback(() => handleDeleteNode(data.type), [data.type, handleDeleteNode])
    const handleNoteClick = useCallback(() => setOpenNote(true), [setOpenNote])
    const handleDoubleClick = useCallback(() => setIndividualId(data.id), [data.id, setIndividualId])

    // Mémorisation du contenu du nœud pour éviter les recalculs
    const nodeContent = useMemo(() => {
        if (settings.showNodeLabel && showContent) {
            return (
                <Card
                    onDoubleClick={handleDoubleClick}
                    className={cn(
                        "p-1 border border-border hover:border-primary duration-100 rounded-lg shadow-none",
                        currentNode === data.id && "border-primary",
                    )}
                >
                    <div className="flex gap-2 items-center rounded-full">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={data?.image_url} alt={data.full_name} />
                            <AvatarFallback>{loading ? "..." : data.full_name[0]}</AvatarFallback>
                        </Avatar>
                        {settings.showNodeLabel && showContent && (
                            <div className="flex items-center gap-1">
                                <span className="text-sm">{data.full_name}</span>
                                {settings.showCopyIcon && <CopyButton className="rounded-full" content={data.full_name} />}
                            </div>
                        )}
                    </div>
                </Card>
            )
        }

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onDoubleClick={handleDoubleClick}
                            className={cn(
                                "rounded-full border border-transparent hover:border-primary",
                                currentNode === data.id && "border-primary",
                            )}
                        >
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={data?.image_url} alt={data.full_name} />
                                <AvatarFallback>
                                    <User className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>{data.full_name}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }, [settings.showNodeLabel, showContent, data, loading, currentNode, handleDoubleClick, settings.showCopyIcon])

    // Mémorisation des handles pour éviter les recalculs
    const handles = useMemo(
        () => (
            <>
                <Handle
                    type="target"
                    position={Position.Top}
                // className={cn("w-16 bg-teal-500 opacity-0", showContent ? "group-hover:opacity-100 opacity-0" : "opacity-0")}
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                // className={cn("w-16 bg-teal-500 opacity-0", showContent ? "group-hover:opacity-100 opacity-0" : "opacity-0")}
                />
            </>
        ),
        [showContent],
    )

    return (
        <div style={{ ...props.style, borderRadius: "100000px!important" }}>
            <div className={cn(loading ? "opacity-40" : "opacity-100", "overflow-hidden group")}>
                {nodeContent}
                {handles}
            </div>
        </div>
    )
}

const IndividualNode = memo(
    (props: any) => (
        <NodeProvider>
            <Custom {...props} />
        </NodeProvider>
    ),
    (prevProps, nextProps) => {
        // Comparaison personnalisée pour éviter les re-rendus inutiles
        // Ne re-rendre que si les données importantes ont changé
        return (
            prevProps.id === nextProps.id &&
            prevProps.data.full_name === nextProps.data.full_name &&
            prevProps.data.image_url === nextProps.data.image_url &&
            prevProps.selected === nextProps.selected
        )
    },
)

export default IndividualNode


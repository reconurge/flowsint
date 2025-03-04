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

    // Mémorisation des éléments UI complexes
    const nodeToolbar = useMemo(() => {
        if (!settings.showNodeToolbar) return null

        return (
            <NodeToolbar isVisible={data.forceToolbarVisible || undefined} position={Position.Top}>
                <Card className="p-1 rounded-full shadow-none backdrop-blur bg-background/40">
                    <div className="flex gap-1">
                        <Button variant="outline" className="rounded-full" size="sm" onClick={handleEditClick}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                        <Button variant="outline" className="rounded-full" size="sm" onClick={handleChatClick}>
                            <Zap className="h-4 w-4 mr-2 text-orange-500" />
                            Ask AI
                        </Button>
                    </div>
                </Card>
            </NodeToolbar>
        )
    }, [settings.showNodeToolbar, data.forceToolbarVisible, handleEditClick, handleChatClick])

    // Mémorisation du contenu du nœud pour éviter les recalculs
    const nodeContent = useMemo(() => {
        if (settings.showNodeLabel && showContent) {
            return (
                <Card
                    onDoubleClick={handleDoubleClick}
                    className={cn(
                        "p-1 border border-border hover:border-primary duration-100 rounded-lg shadow-none backdrop-blur bg-background/40",
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
                    // className={cn("w-16 bg-teal-500", showContent ? "group-hover:opacity-100 opacity-0" : "opacity-0")}
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    // className={cn("w-16 bg-teal-500", showContent ? "group-hover:opacity-100 opacity-0" : "opacity-0")}
                />
            </>
        ),
        [showContent],
    )

    // Mémorisation du menu contextuel pour éviter les recalculs
    const contextMenuItems = useMemo(
        () => (
            <ContextMenuContent>
                <ContextMenuItem onClick={handleSearchClick}>Launch search</ContextMenuItem>
                <ContextMenuItem onClick={handleNoteClick}>
                    New note
                    <SquarePenIcon className="!h-4 !w-4" />
                </ContextMenuItem>
                <ContextMenuSub>
                    <ContextMenuSubTrigger>New</ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                        <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "individuals")}>
                            <User className="mr-2 h-4 w-4 opacity-70" /> New relation
                        </ContextMenuItem>
                        <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "phone_numbers", data.id)}>
                            <Phone className="mr-2 h-4 w-4 opacity-70" />
                            Phone number
                        </ContextMenuItem>
                        <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "physical_addresses", data.id)}>
                            <MapPin className="mr-2 h-4 w-4 opacity-70" />
                            Physical address
                        </ContextMenuItem>
                        <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "emails", data.id)}>
                            <AtSign className="mr-2 h-4 w-4 opacity-70" />
                            Email address
                        </ContextMenuItem>
                        <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "ip_addresses", data.id)}>
                            <Locate className="mr-2 h-4 w-4 opacity-70" />
                            IP address
                        </ContextMenuItem>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>Social account</ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                                <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "social_accounts_facebook", data.id)}>
                                    <Facebook className="mr-2 h-4 w-4 opacity-70" />
                                    Facebook
                                </ContextMenuItem>
                                <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "social_accounts_instagram", data.id)}>
                                    <Instagram className="mr-2 h-4 w-4 opacity-70" />
                                    Instagram
                                </ContextMenuItem>
                                <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "social_accounts_telegram", data.id)}>
                                    <Send className="mr-2 h-4 w-4 opacity-70" />
                                    Telegram
                                </ContextMenuItem>
                                <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "social_accounts_signal", data.id)}>
                                    <MessageCircleDashed className="mr-2 h-4 w-4 opacity-70" />
                                    Signal
                                </ContextMenuItem>
                                <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "social_accounts_snapchat", data.id)}>
                                    <Camera className="mr-2 h-4 w-4 opacity-70" />
                                    Snapchat
                                </ContextMenuItem>
                                <ContextMenuItem onClick={(e) => setOpenAddNodeModal(e, "social_accounts_github", data.id)}>
                                    <GithubIcon className="mr-2 h-4 w-4 opacity-70" />
                                    Github
                                </ContextMenuItem>
                                <ContextMenuItem disabled onClick={(e) => setOpenAddNodeModal(e, "social_accounts_coco", data.id)}>
                                    Coco{" "}
                                    <Badge variant="outline" className="ml-2">
                                        soon
                                    </Badge>
                                </ContextMenuItem>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                    </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuItem onClick={handleEditClick}>View and edit</ContextMenuItem>
                <ContextMenuItem onClick={handleDuplicateClick}>Duplicate</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleDeleteClick} className="text-red-600">
                    Delete
                    <span className="ml-auto text-xs text-muted-foreground">⌘ ⌫</span>
                </ContextMenuItem>
            </ContextMenuContent>
        ),
        [
            handleSearchClick,
            handleNoteClick,
            setOpenAddNodeModal,
            data.id,
            handleEditClick,
            handleDuplicateClick,
            handleDeleteClick,
        ],
    )

    return (
        <div style={{ ...props.style, borderRadius: "100000px!important" }}>
            {nodeToolbar}
            <ContextMenu>
                <ContextMenuTrigger
                    onContextMenu={(e) => {
                        e.stopPropagation()
                    }}
                >
                    <div className={cn(loading ? "opacity-40" : "opacity-100", "overflow-hidden group")}>
                        {nodeContent}
                        {handles}
                    </div>
                </ContextMenuTrigger>
                {contextMenuItems}
            </ContextMenu>
        </div>
    )
}

// Utilisation de React.memo avec une fonction de comparaison personnalisée
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


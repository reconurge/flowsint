"use client"

import { memo } from "react"
import { Handle, NodeToolbar, Position, useStore } from "@xyflow/react"
import { useInvestigationContext } from "@/components/contexts/investigation-provider"
import { NodeProvider, useNodeContext } from "@/components/contexts/node-context"
import { useSearchContext } from "@/components/contexts/search-context"
import { cn, zoomSelector } from "@/lib/utils"
import { CopyButton } from "@/components/copy"
import { useChatContext } from "@/components/contexts/chatbot-context"
import { GithubIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import {
    AtSign,
    Bot,
    Camera,
    Edit,
    Facebook,
    Instagram,
    Locate,
    MapPin,
    MessageCircleDashed,
    Phone,
    Send,
    User,
    Zap,
} from "lucide-react"
import { useFlowStore } from "@/components/contexts/use-flow-store"

function Custom(props: any) {
    const { settings, handleOpenIndividualModal } = useInvestigationContext()
    const { currentNode } = useFlowStore()
    const { setOpenAddNodeModal, handleDuplicateNode, handleDeleteNode, loading } = useNodeContext()
    const { handleOpenSearchModal } = useSearchContext()
    const { handleOpenChat } = useChatContext()
    const showContent = useStore(zoomSelector)
    const { data } = props

    return (
        <>
            {settings.showNodeToolbar && (
                <NodeToolbar isVisible={data.forceToolbarVisible || undefined} position={Position.Top}>
                    <Card className="p-1 rounded-full shadow-none backdrop-blur bg-background/40">
                        <div className="flex gap-1">
                            <Button variant="outline" className="rounded-full" size="sm" onClick={() => handleOpenIndividualModal(data.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                            <Button variant="outline" className="rounded-full" size="sm" onClick={() => handleOpenChat(data)}>
                                <Zap className="h-4 w-4 mr-2 text-orange-500" />
                                Ask AI
                            </Button>
                        </div>
                    </Card>
                </NodeToolbar>
            )}
            <ContextMenu>
                <ContextMenuTrigger
                    onContextMenu={(e) => {
                        e.stopPropagation()
                    }}
                >
                    <div className={cn(loading ? "opacity-40" : "opacity-100", "overflow-hidden group")}>
                        {settings.showNodeLabel && showContent ? (
                            <Card
                                onDoubleClick={() => handleOpenIndividualModal(data.id)}
                                className={cn(
                                    "p-1 border border-border hover:border-primary/40 rounded-full shadow-none backdrop-blur bg-background/40",
                                    currentNode === data.id && "border-primary/40",
                                )}
                            >
                                <div className="flex gap-2 items-center rounded-full">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={data?.image_url} alt={data.full_name} />
                                        <AvatarFallback>{loading ? "..." : data.full_name[0]}</AvatarFallback>
                                    </Avatar>
                                    {settings.showNodeLabel && showContent && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{data.full_name}</span>
                                            {settings.showCopyIcon && <CopyButton className="rounded-full" content={data.full_name} />}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onDoubleClick={() => handleOpenIndividualModal(data.id)}
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
                        )}

                        <Handle
                            type="target"
                            position={Position.Top}
                            className={cn("w-16 bg-teal-500", showContent ? "group-hover:opacity-100 opacity-0" : "opacity-0")}
                        />
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            className={cn("w-16 bg-teal-500", showContent ? "group-hover:opacity-100 opacity-0" : "opacity-0")}
                        />
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleOpenSearchModal(data.full_name)}>
                        Launch search
                        <Zap className="ml-2 h-4 w-4 text-orange-500" />
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleOpenChat(data)}>
                        Ask AI
                        <Bot className="ml-2 h-4 w-4 text-teal-600" />
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
                    <ContextMenuItem onClick={() => handleOpenIndividualModal(data.id)}>View and edit</ContextMenuItem>
                    <ContextMenuItem onClick={handleDuplicateNode}>Duplicate</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={handleDeleteNode} className="text-red-600">
                        Delete
                        <span className="ml-auto text-xs text-muted-foreground">⌘ ⌫</span>
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </>
    )
}

const IndividualNode = (props: any) => (
    <NodeProvider>
        <Custom {...props} />
    </NodeProvider>
)

export default memo(IndividualNode)


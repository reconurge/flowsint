import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
    ChevronDown,
    Plus,
    Trash2,
    MessageSquare,
} from "lucide-react"
import { useChat } from "@/hooks/use-chat"
import { useChatState } from "@/stores/use-chat-store"
import { formatDistanceToNow } from "date-fns"

interface ChatSelectorProps {
    className?: string
}

export const ChatSelector = ({ className }: ChatSelectorProps) => {
    const {
        chats,
        isLoadingChats,
        createNewChat,
        switchToChat,
    } = useChat({
        onContentUpdate: () => { },
        onSuccess: () => { },
    })

    const currentChatId = useChatState(s => s.currentChatId)
    const handleCreateNewChat = () => {
        createNewChat()
    }

    const handleSwitchChat = (chatId: string) => {
        switchToChat(chatId)
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Unknown"
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true })
        } catch {
            return "Unknown"
        }
    }

    if (isLoadingChats) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Loading chats...</span>
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 gap-1 text-xs"
                        >
                            <MessageSquare className="h-3 w-3" />
                            <span className="max-w-[120px] truncate">
                                {currentChat?.title || "Select Chat"}
                            </span>
                            <ChevronDown className="h-3 w-3" />
                        </Button>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <div className="px-2 py-1.5">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            Chats ({chats.length})
                        </div>
                    </div>
                    <DropdownMenuSeparator />

                    {chats.length === 0 ? (
                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                            No chats yet
                        </div>
                    ) : (
                        chats.map((chat) => (
                            <DropdownMenuItem
                                key={chat.id}
                                onClick={() => handleSwitchChat(chat.id)}
                                className={`flex items-center justify-between px-2 py-1.5 cursor-pointer ${chat.id === currentChatId ? 'bg-accent' : ''
                                    }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">
                                        {chat.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {formatDate(chat.updated_at || chat.created_at)}
                                    </div>
                                </div>
                                {chat.id === currentChatId && (
                                    <Badge variant="secondary" className="text-xs">
                                        Current
                                    </Badge>
                                )}
                            </DropdownMenuItem>
                        ))
                    )}

                    <DropdownMenuSeparator />

                    <div className="flex gap-1 p-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCreateNewChat}
                            className="flex-1 h-8 text-xs"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            New Chat
                        </Button>
                        {currentChat && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDeleteCurrentChat}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
} 
import { chatCRUDService } from '@/api/chat-service'
import { useQuery } from '@tanstack/react-query'
import { SkeletonList } from '../shared/skeleton-list'
import { Button } from '../ui/button'
import { ArrowLeft, Trash, Sparkles } from 'lucide-react'
import { Chat } from '@/types'
import { useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useConfirm } from '../use-confirm-dialog'
import { useChatState } from '@/stores/use-chat-store'

const ChatHistory = ({
  setView,
  deleteChatMutation,
  handleCreateNewChat
}: {
  setView: any
  deleteChatMutation: any
  handleCreateNewChat: any
}) => {
  const { confirm } = useConfirm()
  const setCurrentChatId = useChatState((s) => s.setCurrentChatId)
  const { data: chats, isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatCRUDService.get()
  })

  const switchToChat = (chatId: string) => {
    setView('chat')
    setCurrentChatId(chatId)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b w-full">
        <div className="flex w-full items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              //@ts-ignore
              onClick={() => setView('chat')}
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <span className="opacity-60">Chat history</span>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="p-4">
          <SkeletonList rowCount={4} />
        </div>
      ) : chats && chats.length > 0 ? (
        <div className="grow overflow-auto p-4 flex flex-col gap-2">
          {chats.map((chat: Chat) => (
            <ChatItem
              switchToChat={switchToChat}
              deleteChatMutation={deleteChatMutation}
              confirm={confirm}
              key={chat.id}
              chat={chat}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-full p-6 border border-primary/20">
              <Sparkles className="h-8 w-8 text-primary/60" />
            </div>
          </div>
          <div className="space-y-2 max-w-sm">
            <h3 className="text-lg font-semibold text-foreground">No conversations yet</h3>
            <p className="text-sm opacity-70">
              Start chatting with AI to analyze your investigation data and get insights. Your
              conversation history will appear here.
            </p>
          </div>
          <div className="mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNewChat}
              className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:from-primary/20 hover:to-primary/10"
            >
              Start your first chat
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatHistory

const ChatItem = ({
  chat,
  confirm,
  deleteChatMutation,
  switchToChat
}: {
  chat: Chat
  confirm: any
  deleteChatMutation: any
  switchToChat: any
}) => {
  const handleDeleteChat = useCallback(async (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    if (
      await confirm({
        title: 'Are you sure you want to delete this chat?',
        message: 'This action is irreversible.'
      })
    ) {
      await deleteChatMutation.mutateAsync(chat.id)
    }
  }, [])
  return (
    <button
      onClick={() => switchToChat(chat.id)}
      className="flex w-full cursor-pointer justify-start items-center bg-muted-foreground/5 backdrop-blur-sm rounded-xl p-2 px-4 hover:bg-muted-foreground/10 transition-all duration-300"
    >
      <div className="flex items-start flex-col justify-between min-w-0 flex-1 overflow-hidden">
        <span className="font-semibold text-md truncate text-left w-full">{chat.title}</span>
        <span className="font-normal text-xs">
          {formatDistanceToNow(chat.last_updated_at, { addSuffix: true })}
        </span>
      </div>
      <div className="flex items-center justify-between shrink-0 ml-2">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDeleteChat}>
          <Trash className="h-3 w-3" />
        </Button>
      </div>
    </button>
  )
}

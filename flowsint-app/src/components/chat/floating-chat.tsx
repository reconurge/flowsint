import { useChat } from '@/hooks/use-chat'
import { memo, useEffect, useRef, useState } from 'react'
import { ChatPanel } from './chat-prompt'
import { Button } from '../ui/button'
import { X, Plus, History } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { Card } from '../ui/card'
import { useLayoutStore } from '@/stores/layout-store'
import { cn } from '@/lib/utils'
import { MemoizedMarkdown } from './memoized-markdown'
import { ChatSkeleton } from './chat-skeleton'
import { ResizableChat } from './resizable-chat'
import ChatHistory from './chat-history'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { CopyButton } from '../copy'
import type { UIMessage } from 'ai'
import { useIsChatActive } from '@/hooks/use-is-chat-active'
import ChatInactive from './chat-inactive'

function FloatingChat() {
  const bottomRef = useRef<HTMLDivElement>(null)
  const isOpenChat = useLayoutStore((s) => s.isOpenChat)
  const toggleChat = useLayoutStore((s) => s.toggleChat)
  const closeChat = useLayoutStore((s) => s.closeChat)
  const [view, setView] = useState<'chat' | 'history'>('chat')

  const {
    messages,
    status,
    sendMessage,
    currentChat,
    isLoadingChat,
    createNewChat,
    deleteChatMutation,
    currentChatId
  } = useChat()

  const { exists: isChatActive } = useIsChatActive()

  const isStreaming = status === 'streaming' || status === 'submitted'

  const { isMac } = useKeyboardShortcut({
    key: 'e',
    ctrlOrCmd: true,
    callback: toggleChat
  })

  useKeyboardShortcut({
    key: 'Escape',
    ctrlOrCmd: false,
    callback: closeChat
  })

  const handleCreateNewChat = () => {
    createNewChat()
    setView('chat')
  }

  const hasMessages = messages.length > 0

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const keyboardShortcut = isMac ? '⌘+E' : 'Ctrl+E'

  return (
    <>
      {!isOpenChat && (
        <div className="fixed bottom-12 right-4 z-20">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    className="h-16 w-16 p-0 rounded-full cursor-pointer bg-background border border-border bg-opacity-100"
                    variant="outline"
                    onClick={toggleChat}
                  >
                    <img src="/icon.png" alt="Flowsint" className="h-12 w-12 object-contain" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <div className="text-center">
                  <div>Toggle assistant</div>
                  <div className="text-xs opacity-70">{keyboardShortcut}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Chat Panel */}
      {isOpenChat && (
        <div className="fixed bottom-12 overflow-hidden rounded-2xl right-4 shadow-xl z-50">
          <ResizableChat minWidth={400} minHeight={400} maxWidth={800} maxHeight={800}>
            {isChatActive ? (
              <Card className="overflow-hidden backdrop-blur! bg-background/90 rounded-2xl gap-0 py-0 h-full">
                {view === 'history' ? (
                  <ChatHistory
                    setView={setView}
                    deleteChatMutation={deleteChatMutation}
                    handleCreateNewChat={handleCreateNewChat}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between h-10 p-3 border-b">
                      <div className="flex w-full items-center justify-between gap-1">
                        <div className="flex items-center gap-2 truncate text-ellipsis">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            //@ts-ignore
                            onClick={handleCreateNewChat}
                            title="Create new chat"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm opacity-60 truncate text-ellipsis">
                            {currentChat?.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            //@ts-ignore
                            onClick={() => setView('history')}
                            title="Create new chat"
                          >
                            <History className="h-3 w-3 opacity-60" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={closeChat}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 overflow-auto">
                      {isLoadingChat ? (
                        <ChatSkeleton />
                      ) : hasMessages ? (
                        <div className="grow p-4 flex flex-col gap-2">
                          {messages.map((message: UIMessage) => (
                            <ChatMessageComponent key={message.id} message={message} />
                          ))}
                          <div ref={bottomRef} />
                        </div>
                      ) : null}
                      {!hasMessages && !isLoadingChat && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                          {!currentChatId ? (
                            <>
                              <div className="relative mb-6">
                                <div className="absolute inset-0 bg-linear-to-r from-primary/20 to-primary/10 rounded-full blur-xl animate-pulse"></div>
                                <div className="relative bg-linear-to-br from-primary/10 to-primary/5 rounded-full p-4 border border-primary/20">
                                  <img
                                    src="/icon.png"
                                    alt="Flowsint"
                                    className="h-12 w-12 object-cover"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2 max-w-sm">
                                <h3 className="text-lg font-semibold text-foreground">
                                  No conversations yet
                                </h3>
                                <p className="text-sm opacity-70">
                                  Start chatting with AI to analyze your investigation data and get
                                  insights. Your conversation history will appear here.
                                </p>
                              </div>
                              <div className="mt-6">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCreateNewChat}
                                  className="bg-linear-to-r from-primary/10 to-primary/5 border-primary/20 hover:from-primary/20 hover:to-primary/10"
                                >
                                  Start your first chat
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-2 max-w-sm">
                                <h3 className="text-lg font-semibold text-foreground">
                                  Start your conversation with{' '}
                                  <span className="text-primary">Flo</span>
                                </h3>
                                <p className="text-sm opacity-70">
                                  Ask me anything about your investigation. Here are some examples:
                                </p>
                              </div>
                              <div className="mt-6 space-y-3 max-w-md">
                                <div className="text-xs space-y-1">
                                  <p className="font-medium text-left">Analysis & Insights</p>
                                  <ul className="space-y-1 text-left opacity-60">
                                    <li>• "Analyze the connections between these entities"</li>
                                    <li>• "What patterns do you see in this data?"</li>
                                    <li>• "Summarize the key findings from this investigation"</li>
                                  </ul>
                                </div>
                                <div className="text-xs space-y-1">
                                  <p className="font-medium text-left">Investigation Help</p>
                                  <ul className="space-y-1 text-left opacity-60">
                                    <li>• "Suggest next steps for this investigation"</li>
                                    <li>• "What should I look for next?"</li>
                                    <li>• "Help me organize this investigation"</li>
                                  </ul>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="border-t">
                      <ChatPanel onSend={sendMessage} isLoading={isStreaming} />
                    </div>
                  </>
                )}
              </Card>
            ) : (
              <Card className="overflow-hidden backdrop-blur! bg-background/90 rounded-2xl gap-0 py-0 h-full">
                <ChatInactive onClose={closeChat} />
              </Card>
            )}
          </ResizableChat>
        </div>
      )}
    </>
  )
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

const ChatMessageComponent = ({ message }: { message: UIMessage }) => {
  const content = getMessageText(message)

  if (message.role === 'assistant')
    return (
      <MessageContainer copyContent={content}>
        <div className={cn('justify-start', 'flex w-full border rounded-lg')}>
          <div className={cn('w-full', 'p-3 rounded-xl max-w-full', 'flex flex-col')}>
            <MemoizedMarkdown id={message.id} content={content} />
          </div>
        </div>
      </MessageContainer>
    )

  return (
    <MessageContainer copyContent={content}>
      <div className={cn('items-end', 'flex w-full flex-col gap-2')}>
        <div
          className={cn(
            'bg-muted-foreground/5 max-w-[80%] border border-border',
            'p-1 rounded-lg',
            'flex flex-col items-end overflow-x-hidden'
          )}
        >
          <span className="px-3">
            <MemoizedMarkdown id={message.id} content={content} />
          </span>
        </div>
      </div>
    </MessageContainer>
  )
}

const MessageContainer = memo(
  ({ children, copyContent }: { children: React.ReactNode; copyContent?: string }) => {
    return (
      <div className="relative group/msg">
        {children}
        <div className="flex items-center justify-end z-1 ">
          <div className="group-hover/msg:opacity-100 border -mt-1 opacity-0 bg-background rounded">
            <CopyButton content={copyContent ?? ''} />
          </div>
        </div>
      </div>
    )
  }
)

const MemoizedFloatingChat = memo(FloatingChat)

MemoizedFloatingChat.displayName = 'MemoizedFloatingChat'

export default MemoizedFloatingChat

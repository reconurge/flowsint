import { useChat } from '@/hooks/use-chat'
import { memo, useEffect, useState, useRef } from 'react'
import { ChatPanel, ContextList } from './chat-prompt'
import { Button } from '../ui/button'
import { X, Plus, History } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { Card } from '../ui/card'
import { useLayoutStore } from '@/stores/layout-store'
import { useChatState } from '@/stores/use-chat-store'
import { useQuery } from '@tanstack/react-query'
import { chatCRUDService } from '@/api/chat-service'
import { ChatMessage } from '@/types'
import { cn } from '@/lib/utils'
import { MemoizedMarkdown } from './memoized-markdown'
import { ChatSkeleton } from './chat-skeleton'
import { ResizableChat } from './resizable-chat'
import ChatHistory from './chat-history'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { CopyButton } from '../copy'

function FloatingChat() {
  const [editorValue, setEditorValue] = useState<any>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const currentChatId = useChatState((s) => s.currentChatId)
  const isOpenChat = useLayoutStore((s) => s.isOpenChat)
  const toggleChat = useLayoutStore((s) => s.toggleChat)
  const closeChat = useLayoutStore((s) => s.closeChat)
  const messages = useChatState((s) => s.messages)
  const setMessages = useChatState((s) => s.setMessages)
  const [view, setView] = useState<'chat' | 'history'>('chat')

  const { data: chat, isLoading } = useQuery({
    queryKey: ['chat', currentChatId],
    enabled: Boolean(currentChatId) && isOpenChat,
    queryFn: () => chatCRUDService.getById(currentChatId as string)
  })

  useEffect(() => {
    setEditorValue('')
    setMessages([])
  }, [currentChatId, setMessages])

  useEffect(() => {
    if (chat?.messages) {
      setMessages(chat.messages)
    }
  }, [chat, setMessages])

  // Chat hook
  const {
    isAiLoading,
    customPrompt,
    setCustomPrompt,
    handleCustomPrompt,
    createNewChat,
    deleteChatMutation
  } = useChat({
    onContentUpdate: setEditorValue,
    onSuccess: () => {}
  })

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

  const handlecreateNewChat = () => {
    createNewChat()
    setView('chat')
  }

  // Check if there's content in the editor
  const hasContent =
    editorValue &&
    (typeof editorValue === 'string'
      ? editorValue.trim() !== ''
      : editorValue.content && editorValue.content.length > 0)
  const hasMessages = messages.length > 0

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, editorValue])

  const keyboardShortcut = isMac ? '⌘+E' : 'Ctrl+E'

  return (
    <>
      {!isOpenChat && (
        <div className="fixed bottom-12 right-4 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    className="h-16 w-16 p-0 rounded-full cursor-pointer bg-background border border-border bg-opacity-100"
                    variant="outline"
                    onClick={toggleChat}
                  >
                    {/* <Sparkles className='!h-5 !w-5' /> */}
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
        <div className="fixed bottom-12 overflow-hidden rounded-2xl right-4 shadow z-21">
          <ResizableChat minWidth={400} minHeight={400} maxWidth={800} maxHeight={800}>
            <Card className="overflow-hidden !backdrop-blur bg-background/90 rounded-2xl gap-0 py-0 h-full">
              {view === 'history' ? (
                <ChatHistory
                  setView={setView}
                  deleteChatMutation={deleteChatMutation}
                  handleCreateNewChat={handlecreateNewChat}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 border-b">
                    <div className="flex w-full items-center justify-between gap-1">
                      <div className="flex items-center gap-2  truncate text-ellipsis">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          //@ts-ignore
                          onClick={handlecreateNewChat}
                          title="Create new chat"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm opacity-60 truncate text-ellipsis">
                          {chat?.title}
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
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={closeChat}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 overflow-auto">
                    {isLoading ? (
                      <ChatSkeleton />
                    ) : hasMessages ? (
                      <div className="grow p-4 flex flex-col gap-2">
                        {messages.map((message: ChatMessage) => (
                          <ChatMessageComponent key={message.id} message={message} />
                        ))}
                        {hasContent && (
                          <ChatMessageComponent
                            key="draft"
                            message={{
                              content: editorValue,
                              is_bot: true,
                              id: new Date().getTime().toString(),
                              created_at: new Date().toISOString(),
                              chatId: currentChatId || undefined
                            }}
                          />
                        )}
                        <div ref={bottomRef} />
                      </div>
                    ) : null}
                    {!hasMessages && !hasContent && !isLoading && (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        {!currentChatId ? (
                          // No currentChatId - Empty state with sparkles
                          <>
                            <div className="relative mb-6">
                              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-xl animate-pulse"></div>
                              <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-full p-4 border border-primary/20">
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
                                onClick={handlecreateNewChat}
                                className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:from-primary/20 hover:to-primary/10"
                              >
                                Start your first chat
                              </Button>
                            </div>
                          </>
                        ) : (
                          // Has currentChatId but no messages - Examples of things to ask
                          <>
                            {/* <div className="relative mb-6">
                                                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-xl animate-pulse"></div>
                                                            <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-full p-6 border border-primary/20">
                                                                <Sparkles className="h-8 w-8 text-primary/60" />
                                                            </div>
                                                        </div> */}
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
                              {/* <div className="text-xs opacity-60 space-y-1">
                                                                <p className="font-medium">Data Exploration:</p>
                                                                <ul className="space-y-1 text-left">
                                                                    <li>• "Find all IP addresses related to this domain"</li>
                                                                    <li>• "Show me all crypto wallets connected to this address"</li>
                                                                    <li>• "What social media accounts are linked to this email?"</li>
                                                                </ul>
                                                            </div> */}
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
                    <ChatPanel
                      customPrompt={customPrompt}
                      setCustomPrompt={setCustomPrompt}
                      handleCustomPrompt={handleCustomPrompt}
                      isAiLoading={isAiLoading}
                      editorValue={editorValue}
                    />
                  </div>
                </>
              )}
            </Card>
          </ResizableChat>
        </div>
      )}
    </>
  )
}

const ChatMessageComponent = ({ message }: { message: ChatMessage }) => {
  if (message.is_bot)
    return (
      <MessageContainer copyContent={message.content}>
        <div className={cn('justify-start', 'flex w-full')}>
          <div className={cn('w-full', 'p-3 rounded-xl max-w-full', 'flex flex-col gap-2')}>
            <MemoizedMarkdown id={message.id} content={message.content} />
          </div>
        </div>
      </MessageContainer>
    )

  return (
    <MessageContainer copyContent={message.content}>
      <div className={cn('items-end', 'flex w-full flex-col gap-2')}>
        <div
          className={cn(
            'bg-muted-foreground/5 max-w-[80%] border border-border',
            'p-1 rounded-lg',
            'flex flex-col items-end overflow-x-hidden'
          )}
        >
          {/* {message?.context && message.context.length > 0 && <div className='flex items-center w-full overflow-x-auto justify-end mb-2'><ContextList context={message.context} /></div>} */}
          <span className="px-3">
            <MemoizedMarkdown id={message.id} content={message.content} />
          </span>
        </div>
      </div>
    </MessageContainer>
  )
}

const MessageContainer = memo(
  ({ children, copyContent }: { children: React.ReactNode; copyContent?: string }) => {
    return (
      <div className="relative group">
        {children}
        <div className="-mt-1 group-hover:opacity-100 opacity-0 flex items-center justify-end z-1">
          <div className="border rounded-md bg-background ">
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

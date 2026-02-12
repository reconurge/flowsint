import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react'
import {
  Sparkles,
  ArrowUp,
  Loader2,
  Bot,
  Copy,
  Check,
  ArrowDownToLine,
  Trash2,
  Globe,
  Zap,
  Wand2
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MemoizedMarkdown } from '@/components/chat/memoized-markdown'
import { templateService } from '@/api/template-service'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  yamlContent?: string
}

interface AIChatPanelProps {
  onApplyYaml: (yaml: string) => void
  currentYaml: string
}

export interface AIChatPanelHandle {
  focusInput: () => void
  sendMessage: (prompt: string) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  { label: 'Generate a basic enricher', icon: Wand2 },
  { label: 'Add an HTTP source', icon: Globe },
  { label: 'Improve performance', icon: Zap }
]

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const AIChatPanel = forwardRef<AIChatPanelHandle, AIChatPanelProps>(
  ({ onApplyYaml, currentYaml }, ref) => {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleSend = useCallback(
      async (prompt?: string) => {
        const text = prompt || input.trim()
        if (!text || isLoading) return

        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: text,
          timestamp: new Date()
        }

        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
          const contextPrompt = currentYaml?.trim()
            ? `Current YAML template:\n\`\`\`yaml\n${currentYaml}\n\`\`\`\n\nUser request: ${text}`
            : text

          const response = await templateService.generate(contextPrompt)

          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Here's the generated template:\n\n\`\`\`yaml\n${response.yaml_content}\n\`\`\``,
            timestamp: new Date(),
            yamlContent: response.yaml_content
          }

          setMessages((prev) => [...prev, assistantMessage])
        } catch (error) {
          const errorMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I encountered an error: ${(error as Error).message}. Please try again.`,
            timestamp: new Date()
          }
          setMessages((prev) => [...prev, errorMessage])
        } finally {
          setIsLoading(false)
        }
      },
      [input, isLoading, currentYaml]
    )

    useImperativeHandle(
      ref,
      () => ({
        focusInput: () => textareaRef.current?.focus(),
        sendMessage: (prompt: string) => handleSend(prompt)
      }),
      [handleSend]
    )

    // Auto-scroll to bottom on new messages
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    // Auto-resize textarea
    useEffect(() => {
      const el = textareaRef.current
      if (el) {
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`
      }
    }, [input])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }

    const handleApply = useCallback(
      (yaml: string) => {
        onApplyYaml(yaml)
        toast.success('Applied to editor')
      },
      [onApplyYaml]
    )

    const handleClear = useCallback(() => {
      setMessages([])
    }, [])

    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b bg-card/30">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium">AI Assistant</span>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Messages — scrollable area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-0">
            {messages.length === 0 ? (
              <EmptyState onPromptClick={handleSend} />
            ) : (
              <>
                {messages.map((message, i) => (
                  <div key={message.id}>
                    {i > 0 && <div className="border-t border-border/40" />}
                    <MessageItem message={message} onApply={handleApply} />
                  </div>
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Quick prompts (when conversation active) */}
        {messages.length > 0 && !isLoading && (
          <div className="shrink-0 px-4 pb-2 flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() => handleSend(p.label)}
                className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 p-3 border-t bg-card/20">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the enricher you need..."
              disabled={isLoading}
              className="min-h-[44px] max-h-[120px] resize-none pr-12 py-3 px-4 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/50 text-sm"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              size="icon"
              variant="ghost"
              className={cn(
                'absolute right-2 bottom-2 h-8 w-8 rounded-lg transition-all',
                input.trim() && !isLoading
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5 px-1">
            Enter to send &middot; Shift+Enter for new line
          </p>
        </div>
      </div>
    )
  }
)

AIChatPanel.displayName = 'AIChatPanel'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState({ onPromptClick }: { onPromptClick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
        <Sparkles className="h-8 w-8 text-primary/30" />
      </div>
      <h3 className="text-sm font-medium mb-1">Template Assistant</h3>
      <p className="text-xs text-muted-foreground mb-6 max-w-[260px] leading-relaxed">
        Describe the enricher you want to build. I understand OSINT concepts, HTTP APIs, and data
        enrichment workflows.
      </p>
      <div className="w-full max-w-[280px] space-y-1.5">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt.label}
            onClick={() => onPromptClick(prompt.label)}
            className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2.5 group"
          >
            <prompt.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
            <span>{prompt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageItem({
  message,
  onApply
}: {
  message: ChatMessage
  onApply: (yaml: string) => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const textToCopy = message.yamlContent || message.content
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  if (message.role === 'user') {
    return (
      <div className="py-2">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-medium text-muted-foreground">You</span>
        </div>
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Bot className="h-3 w-3 text-primary/70" />
        <span className="text-xs font-medium text-muted-foreground">Assistant</span>
      </div>
      <div className="text-sm leading-relaxed">
        <MemoizedMarkdown content={message.content} id={message.id} />
      </div>
      {message.yamlContent && (
        <div className="flex gap-1.5 mt-2">
          <Button
            size="sm"
            onClick={() => onApply(message.yamlContent!)}
            className="h-7 text-xs gap-1.5 rounded-lg"
          >
            <ArrowDownToLine className="h-3 w-3" />
            Apply to Editor
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs gap-1.5 rounded-lg"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="py-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Bot className="h-3 w-3 text-primary/70" />
        <span className="text-xs font-medium text-muted-foreground">Assistant</span>
      </div>
      <div className="flex items-center gap-1.5 py-1">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

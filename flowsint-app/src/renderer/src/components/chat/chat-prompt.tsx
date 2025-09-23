import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { XIcon, ArrowUp } from 'lucide-react'
import { useGraphStore } from '@/stores/graph-store'
import { useRef, useEffect, memo } from 'react'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'

interface ChatPanelProps {
  customPrompt: string
  setCustomPrompt: (prompt: string) => void
  handleCustomPrompt: (editorValue: any) => void
  isAiLoading: boolean
  editorValue: any
}

export const ChatPanel = ({
  customPrompt,
  setCustomPrompt,
  handleCustomPrompt,
  isAiLoading,
  editorValue
}: ChatPanelProps) => {
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const clearSelectedNodes = useGraphStore((s) => s.clearSelectedNodes)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Handle Enter key submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      handleSubmit()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [customPrompt])

  const handleSubmit = () => {
    if (customPrompt.trim() && !isAiLoading) {
      handleCustomPrompt(editorValue)
    }
  }

  // Limit to 10 items and show remaining count if more
  const displayItems = selectedNodes?.slice(0, 10) || []
  const remainingCount = selectedNodes?.length ? Math.max(0, selectedNodes.length - 10) : 0

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-2 flex flex-col gap-2">
        {selectedNodes?.length > 0 && (
          <div className="flex flex-nowrap overflow-x-auto hide-scrollbar gap-1.5 items-center">
            <ContextList context={displayItems} />
            {remainingCount > 0 && (
              <Badge variant="outline" className="text-xs">
                +{remainingCount} more
              </Badge>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-4 w-4 hover:bg-background/80"
              onClick={clearSelectedNodes}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex-1 flex flex-col justify-end">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              autoFocus
              placeholder="Ask me anything about your investigation..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`
                                min-h-[44px] max-h-[120px] resize-none 
                                border border-border bg-background 
                                focus:ring-2 focus:ring-primary/20 focus:border-primary
                                transition-all duration-200
                                pr-12 py-3 px-4 rounded-xl
                            `}
              disabled={isAiLoading}
            />
            <Button
              onClick={handleSubmit}
              disabled={!customPrompt.trim() || isAiLoading}
              size="icon"
              variant={'ghost'}
              className={`
                                absolute bg-muted right-2 bottom-2
                                h-8 w-8 rounded-full
                                transition-all duration-200
                                ${
                                  customPrompt.trim() && !isAiLoading
                                    ? 'text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }
                            `}
            >
              {isAiLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {isAiLoading && (
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                <span>Processing...</span>
                            </div>
                        )}
                    </div> */}
        </div>
      </div>
    </div>
  )
}

export const ContextList = memo(({ context }: { context: any }) => {
  const colors = useNodesDisplaySettings((s) => s.colors)
  return (
    <div className="flex flex-nowrap overflow-x-auto hide-scrollbar gap-1.5 items-center px-1">
      {context.map((item: any, index: number) => {
        const color = colors[item?.data?.type || item?.type]
        return (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center border border-border gap-1.5 text-xs"
          >
            <span style={{ background: color }} className="w-1.5 h-1.5 rounded-full" />
            {item.data?.label || 'Unknown'}
          </Badge>
        )
      })}
    </div>
  )
})

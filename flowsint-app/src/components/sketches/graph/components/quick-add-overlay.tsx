import { useCallback, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface QuickAddOverlayProps {
  active: boolean
  position: { x: number; y: number } | null
  text: string
  detection: {
    type: string
    key: string
    fields: Array<{ name: string; primary: boolean }>
  } | null
  loading: boolean
  onTextChange: (text: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export const QuickAddOverlay = ({
  active,
  position,
  text,
  detection,
  loading,
  onTextChange,
  onSubmit,
  onCancel
}: QuickAddOverlayProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (active) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [active])

  // Close on click outside
  useEffect(() => {
    if (!active) return

    const handleMouseDown = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.closest('[data-quick-add]')?.contains(e.target as Node)
      ) {
        onCancel()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown)
    }, 50)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [active, onCancel])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSubmit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    [onSubmit, onCancel]
  )

  if (!active || !position) return null

  const detectedType = detection?.type
  const showBadge = detectedType && text.trim().length > 0

  return (
    <div
      data-quick-add
      className="absolute z-50 pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="flex flex-col items-center gap-1.5">
        {showBadge && !loading && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
            {detectedType}
          </span>
        )}
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 min-w-[200px] max-w-[320px] text-sm shadow-lg border-border/80 bg-background"
          placeholder="Type to add..."
        />
        {loading && (
          <div className="shrink-0">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}

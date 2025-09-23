import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layout-store'

interface ResizableChatProps {
  children: React.ReactNode
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

export const ResizableChat: React.FC<ResizableChatProps> = ({
  children,
  minWidth = 400,
  minHeight = 400,
  maxWidth = 800,
  maxHeight = 800
}) => {
  const { chatWidth, chatHeight, setChatDimensions } = useLayoutStore()
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [startDimensions, setStartDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (direction: 'se' | 'sw' | 'ne' | 'nw') => (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setIsResizing(true)
      setResizeDirection(direction)
      setStartPos({ x: e.clientX, y: e.clientY })
      setStartDimensions({ width: chatWidth, height: chatHeight })

      document.body.style.cursor = direction.includes('e') ? 'e-resize' : 'w-resize'
      document.body.style.userSelect = 'none'
    },
    [chatWidth, chatHeight]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      if (!isResizing || !resizeDirection) return

      const deltaX = e.clientX - startPos.x
      const deltaY = e.clientY - startPos.y

      let newWidth = startDimensions.width
      let newHeight = startDimensions.height

      // Calculate new dimensions based on resize direction
      if (resizeDirection.includes('e')) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, startDimensions.width + deltaX))
      } else if (resizeDirection.includes('w')) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, startDimensions.width - deltaX))
      }

      if (resizeDirection.includes('s')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, startDimensions.height + deltaY))
      } else if (resizeDirection.includes('n')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, startDimensions.height - deltaY))
      }

      setChatDimensions(newWidth, newHeight)
    },
    [
      isResizing,
      resizeDirection,
      startPos,
      startDimensions,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      setChatDimensions
    ]
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    setResizeDirection(null)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
    return undefined
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={containerRef}
      className={cn('relative group overflow-hidden', isResizing && 'pointer-events-none')}
      style={{
        width: chatWidth,
        height: chatHeight
      }}
    >
      {children}

      {/* Resize overlay when active */}
      {isResizing && (
        <div className="absolute inset-0 bg-primary/5 border-2 border-primary/30 rounded-2xl pointer-events-none" />
      )}

      {/* Resize handles */}
      <div
        className={cn(
          'absolute bottom-0 right-0 w-4 h-4 cursor-se-resize',
          'bg-transparent hover:bg-primary/20 transition-colors',
          'rounded-tl-md border-r border-b border-primary/20',
          'group-hover:border-primary/40',
          isResizing && 'bg-primary/30 border-primary/50'
        )}
        onMouseDown={handleMouseDown('se')}
      />

      <div
        className={cn(
          'absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize',
          'bg-transparent hover:bg-primary/20 transition-colors',
          'rounded-tr-md border-l border-b border-primary/20',
          'group-hover:border-primary/40',
          isResizing && 'bg-primary/30 border-primary/50'
        )}
        onMouseDown={handleMouseDown('sw')}
      />

      <div
        className={cn(
          'absolute top-0 right-0 w-4 h-4 cursor-ne-resize',
          'bg-transparent hover:bg-primary/20 transition-colors',
          'rounded-bl-md border-r border-t border-primary/20',
          'group-hover:border-primary/40',
          isResizing && 'bg-primary/30 border-primary/50'
        )}
        onMouseDown={handleMouseDown('ne')}
      />

      <div
        className={cn(
          'absolute top-0 left-0 w-4 h-4 cursor-nw-resize',
          'bg-transparent hover:bg-primary/20 transition-colors',
          'rounded-br-md border-l border-t border-primary/20',
          'group-hover:border-primary/40',
          isResizing && 'bg-primary/30 border-primary/50'
        )}
        onMouseDown={handleMouseDown('nw')}
      />
    </div>
  )
}

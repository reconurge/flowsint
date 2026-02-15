import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

type ResizeDirection = 'se' | 'sw' | 'ne' | 'nw'

function loadPersistedSize(
  storageKey: string,
  defaultWidth: number,
  defaultHeight: number
): { width: number; height: number } {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        return parsed
      }
    }
  } catch {}
  return { width: defaultWidth, height: defaultHeight }
}

interface ResizableContainerProps {
  children: React.ReactNode
  defaultWidth: number
  defaultHeight: number
  onResize?: (width: number, height: number) => void
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  handles?: ResizeDirection[]
  className?: string
  storageKey?: string
}

export const ResizableContainer: React.FC<ResizableContainerProps> = ({
  children,
  defaultWidth,
  defaultHeight,
  onResize,
  minWidth = 200,
  minHeight = 200,
  maxWidth = 800,
  maxHeight = 800,
  handles = ['se', 'sw', 'ne', 'nw'],
  className,
  storageKey
}) => {
  const [size, setSize] = useState(() =>
    storageKey
      ? loadPersistedSize(storageKey, defaultWidth, defaultHeight)
      : { width: defaultWidth, height: defaultHeight }
  )
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [startDimensions, setStartDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (direction: ResizeDirection) => (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setIsResizing(true)
      setResizeDirection(direction)
      setStartPos({ x: e.clientX, y: e.clientY })
      setStartDimensions({ width: size.width, height: size.height })

      document.body.style.cursor = direction.includes('e') ? 'e-resize' : 'w-resize'
      document.body.style.userSelect = 'none'
    },
    [size.width, size.height]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      if (!isResizing || !resizeDirection) return

      const deltaX = e.clientX - startPos.x
      const deltaY = e.clientY - startPos.y

      let newWidth = startDimensions.width
      let newHeight = startDimensions.height

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

      setSize({ width: newWidth, height: newHeight })
      onResize?.(newWidth, newHeight)
    },
    [isResizing, resizeDirection, startPos, startDimensions, minWidth, minHeight, maxWidth, maxHeight, onResize]
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    setResizeDirection(null)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  // Persist to localStorage on resize end
  useEffect(() => {
    if (!isResizing && storageKey) {
      localStorage.setItem(storageKey, JSON.stringify({ width: size.width, height: size.height }))
    }
  }, [isResizing, storageKey, size.width, size.height])

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

  const handleSet = new Set(handles)

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative group/resize overflow-hidden',
        isResizing && 'pointer-events-none',
        className
      )}
      style={{ width: size.width, height: size.height }}
    >
      {children}

      {isResizing && (
        <div className="absolute inset-0 bg-primary/5 border-2 border-primary/30 rounded-2xl pointer-events-none" />
      )}

      {handleSet.has('se') && (
        <div
          className={cn(
            'absolute bottom-0 right-0 w-4 h-4 cursor-se-resize',
            'bg-transparent hover:bg-primary/20 transition-colors',
            'rounded-tl-md border-primary/20',
            'group-hover/resize:border-primary/40',
            isResizing && 'bg-primary/30 border-primary/50'
          )}
          onMouseDown={handleMouseDown('se')}
        />
      )}

      {handleSet.has('sw') && (
        <div
          className={cn(
            'absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize',
            'bg-transparent hover:bg-primary/20 transition-colors',
            'rounded-tr-md border-primary/20',
            'group-hover/resize:border-primary/40',
            isResizing && 'bg-primary/30 border-primary/50'
          )}
          onMouseDown={handleMouseDown('sw')}
        />
      )}

      {handleSet.has('ne') && (
        <div
          className={cn(
            'absolute top-0 right-0 w-4 h-4 cursor-ne-resize',
            'bg-transparent hover:bg-primary/20 transition-colors',
            'rounded-bl-md border-primary/20',
            'group-hover/resize:border-primary/40',
            isResizing && 'bg-primary/30 border-primary/50'
          )}
          onMouseDown={handleMouseDown('ne')}
        />
      )}

      {handleSet.has('nw') && (
        <div
          className={cn(
            'absolute top-0 left-0 w-4 h-4 cursor-nw-resize',
            'bg-transparent hover:bg-primary/20 transition-colors',
            'rounded-br-md border-primary/20',
            'group-hover/resize:border-primary/40',
            isResizing && 'bg-primary/30 border-primary/50'
          )}
          onMouseDown={handleMouseDown('nw')}
        />
      )}
    </div>
  )
}

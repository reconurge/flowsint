import React, { useCallback } from 'react'
import { useLayoutStore } from '@/stores/layout-store'
import { ResizableContainer } from '@/components/ui/resizable-container'

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

  const handleResize = useCallback(
    (width: number, height: number) => {
      setChatDimensions(width, height)
    },
    [setChatDimensions]
  )

  return (
    <ResizableContainer
      defaultWidth={chatWidth}
      defaultHeight={chatHeight}
      onResize={handleResize}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      storageKey="resizable-chat"
      className="max-h-[calc(100vh-60px)]"
    >
      {children}
    </ResizableContainer>
  )
}

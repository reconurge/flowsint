import { useCallback, useRef, useState } from 'react'
import { useGraphStore } from '@/stores/graph-store'
import { findActionItemByKey } from '@/lib/action-items'
import { useActionItems } from './use-action-items'

export const useDragAndDrop = () => {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const { actionItems } = useActionItems()
  const handleOpenFormModal = useGraphStore((s) => s.handleOpenFormModal)
  const dragLeaveTimeoutRef = useRef<number | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current)
    }
    setIsDraggingOver(true)
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current)
    }
    setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    //@ts-ignore
    dragLeaveTimeoutRef.current = setTimeout(() => {
      setIsDraggingOver(false)
    }, 100)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (dragLeaveTimeoutRef.current) {
        clearTimeout(dragLeaveTimeoutRef.current)
      }
      setIsDraggingOver(false)

      const data = e.dataTransfer.getData('text/plain')
      if (!data) return

      try {
        const parsedData = JSON.parse(data)
        if (parsedData?.itemKey) {
          handleOpenFormModal(findActionItemByKey(parsedData.itemKey, actionItems))
        }
      } catch (error) {
        console.warn('Failed to parse dropped data:', error)
      }
    },
    [handleOpenFormModal, actionItems]
  )

  return {
    isDraggingOver,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    }
  }
}

import { memo, useState } from 'react'
import { useIcon } from '@/hooks/use-icon'
import { useGraphStore } from '@/stores/graph-store'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { useActionItems } from '@/hooks/use-action-items'
import { findActionItemByKey } from '@/lib/action-items'

interface DraggableItemProps {
  label: string
  icon: string
  type: string
  color?: string
  disabled?: boolean
  description: string
  itemKey: string
}

export const DraggableItem = memo(function DraggableItem({
  label,
  icon,
  type,
  color,
  itemKey,
  disabled = false,
  description
}: DraggableItemProps) {
  const handleOpenFormModal = useGraphStore((s) => s.handleOpenFormModal)
  const { actionItems } = useActionItems()
  const [isDragging, setIsDragging] = useState(false)
  const colors = useNodesDisplaySettings((s) => s.colors)
  // @ts-ignore
  const colorStr = colors[icon as string] || color
  const IconComponent = useIcon(icon)

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    const itemData = JSON.stringify({ label, type, color, description, itemKey })
    e.dataTransfer.setData('text/plain', itemData)
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const onClick = () => {
    if (disabled) return
    handleOpenFormModal(findActionItemByKey(itemKey, actionItems))
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <button
            draggable={!disabled}
            onClick={onClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={cn(
              'px-3 py-2 group flex items-center w-full gap-3 text-ellipsis rounded-md relative overflow-hidden  border-1 border-l-3 transition-all hover:bg-accent/50',
              {
                'opacity-50': isDragging || disabled,
                'cursor-not-allowed': disabled,
                'cursor-grab': !disabled
              }
            )}
            style={{ borderLeftColor: colorStr }}
          >
            <div>
              <IconComponent size={16} type={type} />
            </div>
            <div className="w-full p-1 text-left flex-1 min-w-0">
              <h3 className="text-sm font-medium truncate w-full">{label}</h3>
              <p className="text-xs opacity-60 truncate w-full">{description}</p>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {disabled ? 'This item is not available' : 'Drag and drop to add to the graph'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

"use client"

import type { LucideIcon } from "lucide-react"
import { GripVertical } from "lucide-react"
import { memo, useState } from "react"
import { IconContainer } from "@/components/icon-container"
import { useGraphStore } from "@/stores/graph-store"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DraggableItemProps {
    label: string
    icon: LucideIcon
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
    description,
}: DraggableItemProps) {
    const handleOpenFormModal = useGraphStore((s) => s.handleOpenFormModal)
    const [isDragging, setIsDragging] = useState(false)

    const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
        const itemData = JSON.stringify({ label, type, color, description, itemKey })
        e.dataTransfer.setData("text/plain", itemData)
        setIsDragging(true)
    }

    const handleDragEnd = () => {
        setIsDragging(false)
    }

    const onClick = () => {
        if (disabled) return
        handleOpenFormModal(itemKey)
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
                            "px-0 py-1 group flex flex-col items-center w-full justify-center gap-1 rounded-md relative overflow-hidden",
                            {
                                "opacity-50": isDragging || disabled,
                                "cursor-not-allowed": disabled,
                                "cursor-grab": !disabled,
                            }
                        )}
                        style={{ borderLeftColor: color }}
                    >
                        <div className="flex justify-center items-center bg-background w-full text-left h-20 border rounded-lg">
                            <IconContainer size={18} icon={icon} color={color} type={type} />
                        </div>
                        <div className="space-y-1 truncate flex-1">
                            <h3 className="text-xs font-normal opacity-60 truncate">{label}</h3>
                        </div>
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    {disabled ? "This item is not available" : "Drag and drop to add to the graph"}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
})

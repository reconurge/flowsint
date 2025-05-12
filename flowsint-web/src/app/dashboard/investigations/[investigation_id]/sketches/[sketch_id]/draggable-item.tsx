"use client"

import type { LucideIcon } from "lucide-react"
import { memo, useState } from "react"
import { IconContainer } from "@/components/icon-container"
import { useSketchStore } from "@/store/sketch-store"
import { cn } from "@/lib/utils"

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
    const handleOpenFormModal = useSketchStore((s) => s.handleOpenFormModal)
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
        <button
            draggable={!disabled}
            onClick={onClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={cn(
                "px-2 py-1 rounded-md relative overflow-hidden border-l-4 bg-card border hover:shadow-md transition-shadow w-full text-left",
                {
                    "opacity-50": isDragging || disabled,
                    "cursor-not-allowed": disabled,
                    "cursor-grab": !disabled,
                }
            )}
            style={{ borderLeftColor: color }}
        >
            <div className="flex justify-start items-center w-full gap-2">
                <IconContainer icon={icon} color={color} type={type} />
                <div className="space-y-1 truncate">
                    <h3 className="text-sm font-medium truncate">{label}</h3>
                    <p className="text-xs text-muted-foreground truncate">{description || label}</p>
                </div>
            </div>
        </button>
    )
})

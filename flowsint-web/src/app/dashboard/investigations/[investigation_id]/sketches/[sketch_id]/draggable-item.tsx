"use client"

import { IconContainer } from "@/components/icon-container"
import { LucideIcon } from "lucide-react"
import { memo } from "react"

export interface DraggableItemProps {
    label: string
    icon: LucideIcon
    type: string
    color?: string
    disabled?: boolean
    description?: string
}

export const DraggableItem = memo(function DraggableItem({
    label,
    icon,
    type,
    color,
    disabled = false,
    description,
}: DraggableItemProps) {
    return (
        <div
            draggable={!disabled}
            className="px-2 py-1 rounded-md relative overflow-hidden border-l-primary cursor-grab bg-card border hover:shadow-md transition-shadow"
            style={{
                borderLeftWidth: "4px",
                borderLeftColor: color,
                cursor: disabled ? "not-allowed" : "grab",
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <div className="flex justify-start items-center gap-2">
                <IconContainer icon={icon} color={color} type={type} />
                <div className="space-y-1">
                    <h3 className="text-sm font-medium">{label}</h3>
                    <p className="text-xs text-muted-foreground">{description || label}</p>
                </div>
            </div>
        </div>
    )
})

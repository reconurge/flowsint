import { Badge } from "@/components/ui/badge"
import { cn, hexToRgba } from "@/lib/utils"
import { useNodesDisplaySettings } from "@/stores/node-display-settings"
import { memo } from "react"

type TypeBadgeProps = {
    type: string
    className?: string
}

function TypeBadgeComponent({ type, className }: TypeBadgeProps) {
    const { colors } = useNodesDisplaySettings()
    const color = colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/60"

    return (
        <Badge
            variant="outline"
            style={{ backgroundColor: hexToRgba(color, 0.3) }}
            className={cn("font-medium border-transparent", className)}
        >
            {type}
        </Badge>
    )
}

export const TypeBadge = memo(TypeBadgeComponent)

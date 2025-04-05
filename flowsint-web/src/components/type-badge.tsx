import { Badge } from "@/components/ui/badge"
import { cn, typeColorMap } from "@/lib/utils"
import { memo } from "react"

type TypeBadgeProps = {
    type: string
    className?: string
}

function TypeBadgeComponent({ type, className }: TypeBadgeProps) {
    const colorClasses = typeColorMap[type] || "bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/60"

    return (
        <Badge
            variant="outline"
            className={cn(colorClasses, "font-medium border-transparent", className)}
        >
            {type}
        </Badge>
    )
}

export const TypeBadge = memo(TypeBadgeComponent)

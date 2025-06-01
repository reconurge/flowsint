import { cn } from "@/lib/utils"
import { Skeleton } from "../ui/skeleton"
interface SkeletonListProps {
    rowCount: number
    className?: string
}

export function SkeletonList({ rowCount, className }: SkeletonListProps) {
    return (
        <ul role="list" className="space-y-1">
            {Array.from({ length: rowCount }).map((_, i) => (
                <Skeleton key={i} className={cn("h-7 w-full rounded-none", className)} />
            ))}
        </ul>
    )
}

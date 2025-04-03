import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
    rows?: number
    columns?: number
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
    return (
        <div className="w-full">
            <div className="border rounded-lg">
                <div className="border-b">
                    <div className="flex">
                        {Array.from({ length: columns }).map((_, i) => (
                            <div
                                key={`header-${i}`}
                                className="flex-1 p-4"
                            >
                                <Skeleton className="h-6 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <div
                            key={`row-${rowIndex}`}
                            className="flex border-b last:border-b-0"
                        >
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <div
                                    key={`cell-${rowIndex}-${colIndex}`}
                                    className="flex-1 p-4"
                                >
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
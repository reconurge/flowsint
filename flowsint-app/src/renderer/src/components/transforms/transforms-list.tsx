import { transformService } from "@/api/transfrom-service"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { SkeletonList } from "../shared/skeleton-list"

const TransformsList = () => {
    const { data: transforms, isLoading } = useQuery({
        queryKey: ["transforms"],
        queryFn: () => transformService.get(),
    })

    if (isLoading) return <div className="p-2"><SkeletonList rowCount={10} /></div>

    if (!transforms || transforms.length === 0)
        return <div className="p-4 text-center text-muted-foreground">No transforms found</div>

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden bg-card">
            <ul className="flex-1 overflow-auto divide-y">
                {transforms.map((transform: any) => (
                    <li key={transform.id}>
                        <Link
                            to={`/dashboard/transforms/$transformId`}
                            params={{ transformId: transform.id }}
                            className="block px-4 py-3 hover:bg-muted cursor-pointer"
                            title={transform.description || "No description"}
                        >
                            <div className="font-semibold text-sm truncate">{transform.name || "(Unnamed transform)"}</div>
                            {transform.category && (
                                <div className="text-xs text-muted-foreground truncate">
                                    Category: {Array.isArray(transform.category) ? transform.category.join(", ") : transform.category}
                                </div>
                            )}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default TransformsList

import { transformService } from "@/api/transfrom-service"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { SkeletonList } from "../shared/skeleton-list"
import { Input } from "../ui/input"
import { useState, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Pencil } from "lucide-react"

const TransformsList = () => {
    const { data: transforms, isLoading } = useQuery({
        queryKey: ["transforms"],
        queryFn: () => transformService.get(),
    })
    const [searchQuery, setSearchQuery] = useState("")

    const filteredTransforms = useMemo(() => {
        if (!transforms) return []
        if (!searchQuery.trim()) return transforms

        const query = searchQuery.toLowerCase().trim()
        return transforms.filter((transform) => {
            const matchesName = transform.name?.toLowerCase().includes(query)
            const matchesCategory = transform.category
                ? (Array.isArray(transform.category)
                    ? transform.category.some(cat => cat.toLowerCase().includes(query))
                    : transform.category.toLowerCase().includes(query))
                : false
            return matchesName || matchesCategory
        })
    }, [transforms, searchQuery])

    if (isLoading) return <div className="p-2"><SkeletonList rowCount={10} /></div>

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden bg-card">
            <div className="p-2 border-b">
                <Input
                    type="search"
                    className="h-7"
                    placeholder="Search transforms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {filteredTransforms.length > 0 ? (
                <ul className="flex-1 overflow-auto divide-y">
                    {filteredTransforms.map((transform: any) => (
                        <li key={transform.id}>
                            <Link
                                to={`/dashboard/transforms/$transformId`}
                                params={{ transformId: transform.id }}
                                className="block px-4 py-3 hover:bg-muted cursor-pointer"
                                title={transform.description || "No description"}
                            >
                                <div className="font-semibold text-sm truncate">{transform.name || "(Unnamed transform)"}</div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    {transform.category && (
                                        <span className="truncate">
                                            {Array.isArray(transform.category) ? transform.category.join(", ") : transform.category}
                                        </span>
                                    )}
                                    {transform.last_updated_at && (
                                        <>
                                            {Boolean(transform.category.length) && <span>•</span>}
                                            <div className="flex items-center gap-1 whitespace-nowrap">
                                                <Pencil className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(transform.last_updated_at), { addSuffix: true })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground">
                    {searchQuery ? "No matching transforms found" : "No transforms found"}
                </div>
            )}
        </div>
    )
}

export default TransformsList

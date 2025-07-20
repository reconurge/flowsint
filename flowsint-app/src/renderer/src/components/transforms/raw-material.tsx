import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import ScannerItem from "./scanner-item"
import { type Scanner } from "@/types/transform"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { transformService } from "@/api/transfrom-service"
import { useQuery } from "@tanstack/react-query"
import { SkeletonList } from "../shared/skeleton-list"


export default function RawMaterial() {

    const { data: materials, isLoading, error } = useQuery({
        queryKey: ["raw_material"],
        queryFn: transformService.getRawMaterial,
    })
    const [searchTerm, setSearchTerm] = useState<string>("")

    const filteredScanners = useMemo(() => {
        if (!materials?.items) return {}
        const result: Record<string, Scanner[]> = {}
        if (!searchTerm.trim()) {
            return materials?.items
        }
        const term = searchTerm.toLowerCase()

        Object.entries(materials?.items).forEach(([category, items]) => {
            // @ts-ignore
            const filtered = items.filter(
                (item: any) =>
                    item.name.toLowerCase().includes(term) ||
                    item.class_name.toLowerCase().includes(term) ||
                    (item.doc && item.doc.toLowerCase().includes(term)),
            )
            if (filtered.length > 0) {
                result[category] = filtered
            }
        })

        return result
    }, [searchTerm, materials?.items])

    if (error) return <div>error</div>

    if (isLoading) return <div><SkeletonList rowCount={7} /></div>
    return (
        <div className="flex flex-col w-full h-full min-h-0 bg-card overflow-y-auto p-4">
            <div className="relative mb-4 flex-shrink-0">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search scanners..."
                    className="pl-8 !border border-border"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1.5 h-6 w-6"
                        onClick={() => setSearchTerm("")}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="flex-1 w-full">
                {Object.entries(filteredScanners).map(([category, scanners]) => (
                    <div key={category} className="space-y-2 w-full">
                        <h3 className="text-sm font-medium capitalize mt-4">{category.replace("_", " ")}</h3>
                        <div className="space-y-2">
                            {/* @ts-ignore */}
                            {scanners.map((scanner: Scanner) => (
                                <ScannerItem
                                    key={scanner.name}
                                    scanner={scanner}
                                    category={scanner.category}
                                />
                            ))}
                        </div>
                    </div>
                ))}
                {Object.keys(filteredScanners).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                        No scanners found matching "{searchTerm}"
                    </div>
                )}
            </div>
        </div>
    )
}
import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { categoryColors } from "../transforms/scanner-data"
import ScannerItem, { type Scanner } from "../transforms/scanner-item"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { transformService } from "@/api/transfrom-service"
import { useQuery } from "@tanstack/react-query"


export default function RawMaterial() {

    const { data: materials, isLoading, error } = useQuery({
        queryKey: ["investigations"],
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

    if (isLoading) return <div>loading</div>
    return (
        <div className="h-full bg-card p-4 overflow-y-auto">
            <div className="relative mb-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search scanners..."
                    className="pl-8"
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
            <div className="space-y-4">
                {Object.entries(filteredScanners).map(([category, scanners]) => (
                    <div key={category} className="space-y-2">
                        <h3 className="text-sm font-medium capitalize pb-1">{category.replace("_", " ")}</h3>
                        <div className="space-y-2">
                            {/* @ts-ignore */}
                            {scanners.map((scanner: Scanner) => (
                                <ScannerItem
                                    key={scanner.name}
                                    scanner={scanner}
                                    category={category}
                                    color={categoryColors[category] || categoryColors[scanner.type] || "#94a3b8"}
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
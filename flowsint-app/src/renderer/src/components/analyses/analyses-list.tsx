import { useQuery } from "@tanstack/react-query"
import { Button } from "../ui/button"
import { PlusIcon, Waypoints } from "lucide-react"
import { Input } from "../ui/input"
import { useParams } from "@tanstack/react-router"
import { SkeletonList } from "../shared/skeleton-list"
import NewSketch from "../sketches/new-sketch"
import { useState, useMemo } from "react"
import { Analysis } from "@/types"
import { analysisService } from "@/api/analysis-service"
import { useAnalysisPanelStore } from "@/stores/analysis-panel-store"
import { cn } from "@/lib/utils"

const AnalysisItem = ({ analysis, active }: { analysis: Analysis, active: boolean }) => {
    return (
        <div className={cn("p-2 flex items-center gap-2 border-b shrink-0", active && "bg-primary/10")}>
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex flex-col">
                    <p className="text-sm font-medium">{analysis.title}</p>
                    <p className="text-xs text-muted-foreground">{analysis.last_updated_at}</p>
                </div>
            </div>
        </div>
    )
}

const AnalysisList = () => {
    const { investigationId, id } = useParams({ strict: false })
    // Fetch all analyses for this investigation
    const currentAnalysisId = useAnalysisPanelStore(s => s.currentAnalysisId)
    const { data: analyses, error, isLoading } = useQuery<Analysis[]>({
        queryKey: ["analyses", investigationId],
        queryFn: () => analysisService.getById(id),
        enabled: !!investigationId,
    })

    const [searchQuery, setSearchQuery] = useState("")

    const filteredAnalysis = useMemo(() => {
        if (!analyses) return []
        if (!searchQuery.trim()) return analyses

        const query = searchQuery.toLowerCase().trim()
        return analyses.filter((analysis: Analysis) =>
            analysis.title.toLowerCase().includes(query)
        )
    }, [analyses, searchQuery])

    if (error) return <div>Error: {(error as Error).message}</div>
    return (
        <div className="w-full h-full bg-card flex flex-col overflow-hidden">
            <div className="p-2 flex items-center gap-2 border-b shrink-0">
                <NewSketch noDropDown>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <PlusIcon className="h-4 w-4" />
                    </Button>
                </NewSketch>
                <Input
                    type="search"
                    className="!border border-border h-7"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-2">
                        <SkeletonList rowCount={7} />
                    </div>
                ) : filteredAnalysis.length > 0 ? (
                    <ul>
                        {filteredAnalysis.map((analysis: Analysis) => (
                            <AnalysisItem
                                active={currentAnalysisId === analysis.id}
                                key={analysis.id}
                                analysis={analysis}
                            />
                        ))}
                    </ul>
                ) : (
                    <div className="p-6 flex flex-col items-center text-center gap-3 text-muted-foreground">
                        <Waypoints className="h-10 w-10 text-yellow-500" />
                        <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-foreground">
                                {searchQuery ? "No matching sketches" : "No sketches yet"}
                            </h3>
                            <p className="text-xs opacity-70 max-w-xs">
                                {searchQuery
                                    ? "Try adjusting your search query to find what you're looking for."
                                    : "This investigation doesn't contain any sketch. Sketches let you organize and visualize your data as graphs."
                                }
                            </p>
                        </div>
                        <NewSketch noDropDown>
                            <Button size="sm" variant="outline">
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Create your first sketch
                            </Button>
                        </NewSketch>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AnalysisList
